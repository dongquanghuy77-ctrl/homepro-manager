import pandas as pd
import glob

files = glob.glob(r"D:\XƯỞNG HOMEPRO SG\9. THÁNG 08.2026\3. VĂN PHÒNG BẢO MINH\VẬT TƯ\*.xlsx")
if files:
    df = pd.read_excel(files[0], sheet_name='Cut List')
    with open("scripts/excel_cutlist.txt", "w", encoding="utf-8") as f:
        f.write("HEADERS:\n")
        f.write(str(list(df.columns)) + "\n\n")
        f.write("FIRST 5 ROWS:\n")
        f.write(df.head(5).to_string())