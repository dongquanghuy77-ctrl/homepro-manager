import pandas as pd
import glob

files = glob.glob(r"D:\XƯỞNG HOMEPRO SG\9. THÁNG 08.2026\2. CT ANH PHIỆT\VẬT TƯ\*.xlsx")
if files:
    file_path = files[0]
    xl = pd.ExcelFile(file_path)
    
    with open("scripts/excel_phiet.txt", "w", encoding="utf-8") as f:
        f.write(f"SHEETS: {xl.sheet_names}\n\n")
        
        for sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet)
            f.write(f"--- SHEET: {sheet} ---\n")
            f.write("HEADERS: " + str(list(df.columns)) + "\n")
            f.write("FIRST 5 ROWS:\n")
            f.write(df.head(5).to_string() + "\n\n")
else:
    with open("scripts/excel_phiet.txt", "w", encoding="utf-8") as f:
        f.write("File not found")