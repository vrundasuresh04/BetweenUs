"""BetweenUs CA3: reproducible, offline MapReduce simulation and ML/NLP evaluation.
Usage: python run_pipeline.py --relationship /path/to/relationship.zip --nlp /path/to/nlp.zip --out results
Does not connect to, modify, or claim to deploy the BetweenUs web app.
"""
import argparse, csv, json, zipfile, random, re, collections, math, os
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
from sklearn.pipeline import make_pipeline
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

DIMS=['Communication','Trust','Support','Conflict_Resolution']
LABELS=['anger','annoyance','disapproval','disgust','gratitude','joy','love','sadness','neutral']

def zip_csv(path):
    z=zipfile.ZipFile(path); names=[n for n in z.namelist() if n.lower().endswith('.csv')]
    return z,names

def relationship_pipeline(path,out):
    z,names=zip_csv(path)
    if len(names)!=1: raise ValueError('Expected one relationship CSV in ZIP')
    pairs=collections.defaultdict(dict); incomplete=0; malformed=0; count=0
    type_scores=collections.defaultdict(lambda:[0.,0]); overall=[0.,0]
    sample=[]; rng=random.Random(42)
    # True map step: map each record to key (Couple_ID,Interaction_ID), value (partner, scores, metadata).
    # Simulated shuffle-and-sort: group identical keys (in-memory grouping, not Hadoop).
    with z.open(names[0]) as fp:
        rows=csv.DictReader((s.decode('utf-8-sig',errors='replace') for s in fp))
        if not set(DIMS+['Couple_ID','Interaction_ID','Partner_ID','Interaction_Type']).issubset(rows.fieldnames):
            raise ValueError('Missing required relationship columns')
        for row in rows:
            count+=1
            try:
                partner=row['Partner_ID']; key=(row['Couple_ID'],row['Interaction_ID'])
                if partner not in ('P1','P2') or partner in pairs[key]: malformed+=1;continue
                scores=tuple(int(row[d]) for d in DIMS)
                if any(not 1<=v<=5 for v in scores):malformed+=1;continue
                pairs[key][partner]=(scores,row['Interaction_Type'])
            except (ValueError, KeyError, TypeError):malformed+=1
    # Reducer: paired P1/P2 scores -> PGS = mean of 4 squared differences; 0..16.
    for key,parts in pairs.items():
        if len(parts)!=2:incomplete+=1;continue
        p1,t=parts['P1'];p2,_=parts['P2'];pgs=sum((a-b)**2 for a,b in zip(p1,p2))/4
        overall[0]+=pgs;overall[1]+=1; type_scores[t][0]+=pgs;type_scores[t][1]+=1
        feat=[abs(a-b) for a,b in zip(p1,p2)]+[(a+b)/2 for a,b in zip(p1,p2)]
        # For demonstration only: target threshold is derived from same scores; no valid predictive evaluation.
        if len(sample)<15000:sample.append([*feat,pgs])
        else:
            j=rng.randrange(int(overall[1]));
            if j<len(sample):sample[j]=[*feat,pgs]
    n=overall[1]
    if n==0:raise ValueError('No complete pairs')
    types=sorted([(t,v[1],round(v[0]/v[1],4)) for t,v in type_scores.items()],key=lambda x:-x[1])
    summary={'input_rows':count,'paired_interactions':int(n),'incomplete_groups':incomplete,'malformed_or_duplicate_rows':malformed,
             'mean_pgs':round(overall[0]/n,4),'pgs_formula':'mean of four squared P1 minus P2 assessment differences (0 to 16)',
             'mapreduce_mode':'Python mapper/shuffle/reducer simulation, NOT an executed Hadoop cluster',
             'interaction_types':[{'type':t,'count':c,'mean_pgs':p} for t,c,p in types]}
    (out/'relationship_summary.json').write_text(json.dumps(summary,indent=2))
    pd.DataFrame(types,columns=['interaction_type','paired_interactions','mean_pgs']).to_csv(out/'pgs_by_interaction_type.csv',index=False)
    plt.figure(figsize=(11,5));plt.bar([x[0] for x in types],[x[2] for x in types]);plt.xticks(rotation=35,ha='right');plt.ylabel('Mean PGS (0–16)');plt.title('Synthetic assessments: perspective gap by interaction type');plt.tight_layout();plt.savefig(out/'pgs_chart.png',dpi=150);plt.close()
    # No misleading ML by predicting PGS from the same four dimension differences used to define it.
    (out/'structured_ml_warning.txt').write_text('No structured ML accuracy reported. A target created from PGS and predicted using its four component differences would be target leakage. Choose an independent outcome (e.g. future Satisfaction_Score) with careful temporal validation before training a meaningful structured model.\n')
    return summary

def nlp_pipeline(path,out):
    z,names=zip_csv(path)
    if not names:raise ValueError('No NLP CSV files found')
    frames=[]
    for n in names:
        with z.open(n) as f:
            frame=pd.read_csv(f,usecols=['id','text']+LABELS)
        frames.append(frame)
    full=pd.concat(frames,ignore_index=True)
    # GoEmotions full data includes multiple raters for same ID. Aggregate votes by ID BEFORE split.
    grouped=full.groupby('id',sort=False).agg({'text':'first', **{lab:'mean' for lab in LABELS}})
    grouped=grouped.dropna(subset=['text'])
    # Restrict to single highest vote; keep tie cases out to avoid arbitrary labels.
    scores=grouped[LABELS].to_numpy();top=np.argmax(scores,axis=1)
    sorted_scores=np.sort(scores,axis=1)
    unique_top=(sorted_scores[:,-1]>sorted_scores[:,-2]) & (sorted_scores[:,-1]>0)
    chosen=grouped.loc[unique_top,['text']].copy();chosen['label']=[LABELS[i] for i in top[unique_top]]
    # Cap per-class examples to avoid excessive runtime and maintain a meaningful class balance.
    chosen=pd.concat([g.sample(n=min(1000,len(g)),random_state=42) for _,g in chosen.groupby('label')])
    # Grouped by ID before split; unique comment ID across train and test.
    x_train,x_test,y_train,y_test=train_test_split(chosen['text'],chosen['label'],test_size=.2,random_state=42,stratify=chosen['label'])
    pipe=make_pipeline(TfidfVectorizer(ngram_range=(1,2),min_df=2,max_features=35000,strip_accents='unicode'),LogisticRegression(max_iter=350,class_weight='balanced'))
    pipe.fit(x_train,y_train);pred=pipe.predict(x_test)
    metrics={'raw_annotation_rows':len(full),'unique_comment_ids':len(grouped),'filtered_labeled_comments':len(chosen),'train':len(x_train),'test':len(x_test),
             'evaluated_labels':LABELS,'model':'TF-IDF (1-2 grams) + LogisticRegression, 9-class subset',
             'accuracy':round(float(accuracy_score(y_test,pred)),4),'macro_f1':round(float(f1_score(y_test,pred,average='macro')),4),
             'limitations':'Emotions in Reddit comments, not relationship intent, toxicity, sarcasm, partner perception, or real-world risk.'}
    (out/'nlp_metrics.json').write_text(json.dumps(metrics,indent=2));(out/'nlp_classification_report.txt').write_text(classification_report(y_test,pred,zero_division=0))
    # These are PROBES, not an annotated evaluation set or claims of reliable bullying detection.
    probes=['You are such an idiot.','That was really helpful, thanks!','Sure, whatever you say.','I am proud of you.','Stop messaging me.','Yeah right, brilliant idea genius.','You always ruin everything.','Haha you idiot, I missed you!','Could you please explain that again?','I am upset about what happened.']
    labels=pipe.predict(probes);probs=pipe.predict_proba(probes);confidence=probs.max(axis=1)
    pd.DataFrame({'text':probes,'predicted_goemotions_label':labels,'model_probability':np.round(confidence,3),'note':'Unvalidated stress-test example: not a bullying/sarcasm detection result'}).to_csv(out/'nlp_stress_probes.csv',index=False)
    return metrics

def main():
    p=argparse.ArgumentParser();p.add_argument('--relationship',required=True);p.add_argument('--nlp',required=True);p.add_argument('--out',default='results');args=p.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    print('Relationship:',json.dumps(relationship_pipeline(args.relationship,out),indent=2))
    print('NLP:',json.dumps(nlp_pipeline(args.nlp,out),indent=2))
    print('Results:',out.resolve())
if __name__=='__main__':main()
