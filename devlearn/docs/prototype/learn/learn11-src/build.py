import os,sys
parts=['core.js']+[p for p in ['tcp.js','k8s.js','mem.js','stat.js'] if os.path.exists(p)]
js='\n'.join(open(p).read() for p in parts)+'\nstart();\n'
html=open('shell.html').read().replace('/*JS*/',js)
open('learn11.html','w').write(html); print('ok',len(html),parts)
