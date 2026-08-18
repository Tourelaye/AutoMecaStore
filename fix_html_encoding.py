import pathlib
path = pathlib.Path(r'Frontend\src\app\fournisseur\stocks\stocks.component.html')
text = path.read_text(encoding='utf-8')
fixed = text.encode('cp1252').decode('utf-8')
path.write_text(fixed, encoding='utf-8')
print('Fixed:', path)
