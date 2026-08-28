import pandas as pd
import glob

files = glob.glob(r"D:\XƯỞNG HOMEPRO SG\9. THÁNG 08.2026\3. VĂN PHÒNG BẢO MINH\VẬT TƯ\*.xlsx")
if files:
    xl = pd.ExcelFile(files[0])
    with open("scripts/excel_sheets.txt", "w", encoding="utf-8") as f:
        f.write("SHEETS: " + str(xl.sheet_names))