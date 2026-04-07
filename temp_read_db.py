import sqlite3

try:
    conn = sqlite3.connect('swiftfix.db')
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM providers LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(row[0])
    conn.close()
except Exception as e:
    print(f"Error: {e}")
