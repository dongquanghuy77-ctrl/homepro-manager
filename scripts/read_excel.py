import pandas as pd
import json
import glob

# Try to find the excel file
files = glob.glob(r"D:\XƯỞNG HOMEPRO SG\9. THÁNG 08.2026\3. VĂN PHÒNG BẢO MINH\VẬT TƯ\*.xlsx")
if files:
    df = pd.read_excel(files[0])
    print(df.head(5).to_json(orient='records', force_ascii=False))
else:
    print("File not found")