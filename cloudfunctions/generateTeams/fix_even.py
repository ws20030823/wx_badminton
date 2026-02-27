# -*- coding: utf-8 -*-
path = r'd:\Document\VScode\source\wx_badminton\cloudfunctions\generateTeams\index.js'
with open(path, 'rb') as f:
    raw = f.read()

# 1) Remove the 3-line even check block (ASCII part is reliable)
start = b"      if (type === 'doubles' && firstSize % 2 !== 0) {"
end_marker = b"\n      if (type === 'singles') {"
idx = raw.find(start)
if idx != -1:
    j = raw.find(end_marker, idx)
    if j != -1:
        raw = raw[:idx] + b"      if (type === 'singles') {" + raw[j + len(end_marker):]
        print('Removed even check block')
    else:
        # try \r\n
        end_marker = b"\r\n      if (type === 'singles') {"
        j = raw.find(end_marker, idx)
        if j != -1:
            raw = raw[:idx] + b"      if (type === 'singles') {" + raw[j + len(end_marker):]
            print('Removed even check block (CRLF)')
else:
    print('Start block not found')

# 2) Replace error message - try both UTF-8 and GBK
old_msg_utf8 = '请确保每队人数一致，双打需为偶数）'.encode('utf-8')
new_msg_utf8 = '请确保各队人数一致）'.encode('utf-8')
old_msg_gbk = '请确保每队人数一致，双打需为偶数）'.encode('gbk')
new_msg_gbk = '请确保各队人数一致）'.encode('gbk')
if old_msg_utf8 in raw:
    raw = raw.replace(old_msg_utf8, new_msg_utf8, 1)
    print('Updated error message (UTF-8)')
elif old_msg_gbk in raw:
    raw = raw.replace(old_msg_gbk, new_msg_gbk, 1)
    print('Updated error message (GBK)')
else:
    print('Error message not found')

with open(path, 'wb') as f:
    f.write(raw)
print('Done')
