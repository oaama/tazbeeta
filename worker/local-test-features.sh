#!/bin/bash
rm -rf .state
cd ~/wtest
npx wrangler dev --local --port 8799 --persist-to .state > dev.log 2>&1 &
WP=$!
for i in $(seq 1 30); do curl -s localhost:8799/api/health >/dev/null && break; sleep 1; done
U=localhost:8799/api; J='content-type: application/json'
post(){ curl -s -X "${4:-POST}" $U$1 -H "$J" ${3:+-H "authorization: Bearer $3"} -d "$2"; }
get(){ curl -s $U$1 -H "authorization: Bearer $2"; }
C=$(post /auth/signup '{"firstName":"Cust","lastName":"One","email":"c@t.l","phone":"01011112222","password":"Passw0rd123"}' | jq -r .token)
A=$(post /auth/signup '{"firstName":"Ad","lastName":"Min","email":"a@t.l","password":"Passw0rd123"}' | jq -r .token)
python3 - <<'PY'
import sqlite3,glob,json
f=glob.glob('/home/sandbox/wtest/.state/**/*.sqlite',recursive=True)
for p in f:
    c=sqlite3.connect(p)
    try:
        r=c.execute("select doc from docs where c='users'").fetchall()
    except Exception: continue
    for (d,) in r:
        d=json.loads(d)
        if d['email']=='a@t.l':
            d['role']='admin'; c.execute("update docs set doc=? where c='users' and id=?",(json.dumps(d),d['id'])); c.commit(); print('admin set',p[-30:])
PY
SV=$(get /services $C | jq -r '.services[0].id')
echo svc=$SV
TL=$(post /admin/technicians '{"firstName":"Tech","lastName":"Ali","email":"t@t.l","skills":["'$SV'"]}' $A | jq -r .setupLink)
post /auth/reset '{"token":"'${TL#*token=}'","password":"Passw0rd123"}'; echo
T=$(post /auth/login '{"email":"t@t.l","password":"Passw0rd123"}' | jq -r .token)
TID=$(get /me $T | jq -r .user.id)
post /tech/availability '{"available":true}' $T PUT | head -c 80; echo
R=$(post /requests '{"serviceId":"'$SV'","description":"AC not cooling","address":"12 Nile st Cairo","contactPhone":"01011112222","visit":{"date":"2026-12-03","time":"17:30"}}' $C | jq -r .request.id); echo req=$R
echo visit; get /requests $C | jq -c '.requests[0].visit'; get /admin/requests $A | jq -c '.requests[0].visit'
post /admin/requests/$R/inspection '{"note":"Gas leak likely"}' $A | head -c 200; echo
post /admin/requests/$R/quote '{"amount":800,"currency":"EGP","scope":"Refill"}' $A | head -c 300; echo
QV=$(get /requests $C | jq '.requests[0].quote.version'); echo qv=$QV; post /requests/$R/accept-quote '{"version":'$QV'}' $C | jq -c '.request.status // .'
post /admin/requests/$R/assign '{"technicianId":"'$TID'"}' $A | jq -c '.request.status'
post /requests/$R/v4 '{"action":"accept"}' $T >/dev/null
post /requests/$R/status '{"status":"in_progress"}' $T | jq -c '.request.status'
post /requests/$R/status '{"status":"completed"}' $T | jq -c '.request.status'
echo rate; post /requests/$R/v4 '{"action":"rate","tech":4,"service":5,"note":"Great work"}' $C | jq -c '.request.rating'
echo admin-tech-rating; get /admin/users $A | jq -c '[.users[]|select(.role=="technician")|{ratingAvg,ratingCount,ratingNotes}]'
echo complaint; CID=$(post /complaints '{"kind":"complaint","text":"Late arrival yes","requestId":"'$R'"}' $C | jq -r .complaint.id)
post /admin/complaints/$CID '{"status":"resolved","reply":"Sorry, we fixed it"}' $A | jq -c '.complaint|{status,reply}'
get /complaints $C | jq -c '.complaints[0]|{status,reply}'
get /notifications $C | jq -c '[.notifications[0]|{text,textAr}]'
echo cancel-after-assign
R2=$(post /requests '{"serviceId":"'$SV'","description":"Second job x","address":"12 Nile st Cairo","contactPhone":"01011112222"}' $C | jq -r .request.id)
post /admin/requests/$R2/inspection '{"note":"Gas leak likely"}' $A >/dev/null
post /admin/requests/$R2/quote '{"amount":800,"currency":"EGP","scope":"Refill gas"}' $A >/dev/null
QV=$(get /requests $C | jq -r --arg r $R2 '[.requests[]|select(.id==$r)][0].quote.version'); echo qv2=$QV
post /requests/$R2/accept-quote '{"version":'$QV'}' $C | jq -c '.request.status // .'
post /admin/requests/$R2/assign '{"technicianId":"'$TID'"}' $A | jq -c '.request.status // .error'
post /requests/$R2/v4 '{"action":"cancel","reason":"changed my mind"}' $C | jq -c '.request|{status,cancelledAfterAssignment}'
echo policy; post /admin/payment-settings '{"cancelPolicy":"Custom EN rule","cancelPolicyAr":"قاعدة"}' $A PUT | jq -c '.content|{cancelPolicy,cancelPolicyAr}'
echo second-admin; AL=$(post /admin/admins '{"firstName":"Sec","email":"a2@t.l"}' $A | jq -r .setupLink); post /auth/reset '{"token":"'${AL#*token=}'","password":"Passw0rd123"}' >/dev/null
A2=$(post /auth/login '{"email":"a2@t.l","password":"Passw0rd123"}' | jq -r .token); get /me $A2 | jq -c '.user.role'; get /admin/reports $A2 | jq -c '.requests'
echo non-admin; post /admin/admins '{"firstName":"X","email":"x@t.l"}' $C | jq -c .
echo backup; get /admin/backup $A | jq -c '{n:(.docs|length),cols:([.docs[].c]|unique|length)}'
pkill -f workerd; pkill -f wrangler
