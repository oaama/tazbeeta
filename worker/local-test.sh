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
R=$(post /requests '{"serviceId":"'$SV'","description":"AC not cooling","address":"12 Nile st Cairo","contactPhone":"01011112222"}' $C | jq -r .request.id); echo req=$R
echo photo; post /requests/$R/photos '{"data":"data:image/jpeg;base64,/9j/4AAQSkZJRg=="}' $C
post /admin/requests/$R/inspection '{"note":"Gas leak likely"}' $A | jq -c '.request.status'
post /admin/requests/$R/quote '{"amount":800,"currency":"EGP","scope":"Refill gas"}' $A | jq -c '.request.status'
echo notif-cust; get /notifications $C | jq -c '[.notifications[].text,.unread]'
post /requests/$R/v4 '{"action":"rejectQuote","reason":"too expensive"}' $C | jq -c '.request.status'
post /admin/requests/$R/quote '{"amount":700,"currency":"EGP","scope":"Refill gas"}' $A | jq -c '.request.status'
post /requests/$R/accept-quote '{"version":2}' $C | jq -c '.request.status'
post /admin/requests/$R/assign '{"technicianId":"'$TID'"}' $A | jq -c '.request.status // .error'
echo cust-view; get /requests $C | jq -c '.requests[0]|{status,technician,technicianName,warrantyDays,contactPhone}'
echo tech-view; get /requests $T | jq -c '.requests[0]|{status,contactPhone,customerName,customerPhone}'
post /requests/$R/v4 '{"action":"accept"}' $T | jq -c '.request.techAccepted!=null'
post /requests/$R/v4 '{"action":"onway"}' $T | jq -c '.request.onTheWay!=null'
echo chat; post /requests/$R/messages '{"text":"call me 0101 111 2222 please"}' $C | jq -c '.message.text'
post /requests/$R/messages '{"text":"ok on my way"}' $T | jq -c '.message.senderRole'
echo admin-reply-should-403; post /requests/$R/messages '{"text":"hi"}' $A
get /requests/$R/messages $A | jq -c '{n:(.messages|length),roles:[.messages[].senderRole],adminCanReply}'
post /requests/$R/v4 '{"action":"arrive"}' $T | jq -c '.request.status'
post /requests/$R/photos '{"data":"data:image/jpeg;base64,/9j/4AAQSkZJRg==","kind":"after"}' $T | jq -c .
post /requests/$R/v4 '{"action":"report","text":"Gas refilled","hours":2}' $T | jq -c '.request.report.text'
post /requests/$R/status '{"status":"completed"}' $T | jq -c '.request.status'
post /requests/$R/v4 '{"action":"pay","method":"cash"}' $C | jq -c '.request.payment.status'
post /requests/$R/v4 '{"action":"confirmCash"}' $T
post /admin/payments/$R/cash-received '{}' $A | jq -c '.request.payment.status // .'
get /admin/settlements $A | jq -c '{rows:.rows|map({collected,commission,technicianShare,settled}),t:.technicians}'
post /admin/settlements/$R/pay '{}' $A | jq -c '.request.settlement.amount'
post /requests/$R/v4 '{"action":"rate","tech":5,"service":4,"note":"great"}' $C | jq -c '.request.rating'
get /requests $C | jq -c '.requests[0]|{technician,warrantyUntil}'
echo notif-tech; get /notifications $T | jq -c '[.notifications[].text]'
echo content; curl -s $U/content | jq -c '.content|{whatsapp,commissionPct,adminChatReply}'
echo signup-verify-no-email-config; post /auth/signup '{"firstName":"V","lastName":"V","email":"v@t.l","password":"Passw0rd123","verify":true}'
kill $WP; wait $WP 2>/dev/null
