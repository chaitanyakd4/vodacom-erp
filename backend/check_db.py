import sqlite3
c = sqlite3.connect('app.db')
r = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", r)
