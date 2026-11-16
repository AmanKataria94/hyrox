import csv, sys, json, statistics as st
from collections import defaultdict
p = sys.argv[1]
ST = ['ski','push','pull','bbj','row','farmers','lunges','wallballs']
def T(s):
    if not s: return None
    a = s.split(':');
    try: a=[float(x) for x in a]
    except: return None
    return a[0]*3600+a[1]*60+a[2] if len(a)==3 else a[0]*60+a[1]
rows = defaultdict(list)
with open(p, newline='', encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        tot=T(r['total_time']); runs=[T(r[f'run_{i}']) for i in range(1,9)]; works=[T(r[f'work_{i}']) for i in range(1,9)]
        rz=T(r['roxzone_time'])
        if None in runs or None in works or not tot or rz is None: continue
        if min(runs)<150 or max(runs)>600 or min(works)<20 or tot<40*60 or tot>120*60: continue
        if sum(runs)+sum(works)+rz > tot*1.05 or sum(runs)+sum(works)+rz < tot*0.9: continue
        rows[(r['gender'],r['division'])].append(dict(tot=tot,runs=runs,works=works,rz=rz,pace=sum(runs)/8))
for k,v in rows.items(): print(k,len(v))
def lin(xs,ys):
    n=len(xs); mx=sum(xs)/n; my=sum(ys)/n
    b=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/sum((x-mx)**2 for x in xs); a=my-b*mx
    res=[y-(a+b*x) for x,y in zip(xs,ys)]; sd=(sum(e*e for e in res)/(n-2))**.5
    return a,b,sd
out={}
pro=rows[('male','pro')]; opn=rows[('male','open')]; dbl=rows[('male','doubles')]
# station time vs run pace (s/km), pro men singles
out['pro_station_vs_pace']={}
print('\nPRO MEN: station = a + b*pace (s/km), resid sd; median at pace 270 (4:30/km)')
for i,s in enumerate(ST):
    xs=[r['pace'] for r in pro]; ys=[r['works'][i] for r in pro]
    a,b,sd=lin(xs,ys); out['pro_station_vs_pace'][s]=dict(a=a,b=b,sd=sd)
    print(f'{s:10s} a={a:7.1f} b={b:5.2f} sd={sd:5.1f}  @270 -> {a+b*270:6.1f}')
# fatigue profile pro men
prof=[st.mean(r['runs'][i]/r['pace'] for r in pro) for i in range(8)]
out['run_profile_pro']=prof; print('\nrun profile (run_i / mean):',[round(x,3) for x in prof])
profd=[st.mean(r['runs'][i]/r['pace'] for r in dbl) for i in range(8)]
out['run_profile_doubles']=profd; print('run profile doubles:',[round(x,3) for x in profd])
# roxzone vs total (doubles & pro)
for name,grp in [('doubles',dbl),('pro',pro)]:
    a,b,sd=lin([r['tot'] for r in grp],[r['rz'] for r in grp]); out[f'roxzone_{name}']=dict(a=a,b=b,sd=sd)
    print(f'\nroxzone {name}: a={a:.1f} b={b:.4f} sd={sd:.1f}; @55min -> {a+b*3300:.0f}s @65min -> {a+b*3900:.0f}s')
# doubles vs open singles station ratio at same pace bins
print('\nDOUBLES/OPEN station ratio by pace bin (men)')
out['doubles_ratio']={}
for i,s in enumerate(ST):
    ratios=[]
    for lo in range(230,360,10):
        a=[r['works'][i] for r in opn if lo<=r['pace']<lo+10]; b=[r['works'][i] for r in dbl if lo<=r['pace']<lo+10]
        if len(a)>50 and len(b)>50: ratios.append(st.median(b)/st.median(a))
    out['doubles_ratio'][s]=st.median(ratios); print(f'{s:10s} {st.median(ratios):.3f}  (bins {len(ratios)})')
# doubles station vs pace directly (open-weight doubles) for reference
print('\nDOUBLES MEN station vs pace')
out['dbl_station_vs_pace']={}
for i,s in enumerate(ST):
    a,b,sd=lin([r['pace'] for r in dbl],[r['works'][i] for r in dbl]); out['dbl_station_vs_pace'][s]=dict(a=a,b=b,sd=sd)
    print(f'{s:10s} a={a:7.1f} b={b:5.2f} sd={sd:5.1f}  @270 -> {a+b*270:6.1f}')
# distributions
for name,grp in [('pro',pro),('doubles',dbl)]:
    q=st.quantiles([r['tot'] for r in grp],n=10); print(f'\n{name} total deciles (min):',[round(x/60,1) for x in q])
q=st.quantiles([r['pace'] for r in pro],n=10); print('pro pace deciles s/km:',[round(x) for x in q])
# share of time
print('pro run share', st.mean(sum(r["runs"])/r["tot"] for r in pro), 'doubles run share', st.mean(sum(r["runs"])/r["tot"] for r in dbl))
json.dump(out,open('fit.json','w'),indent=1)
