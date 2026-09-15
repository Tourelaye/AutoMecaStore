from django.db import connection

cursor = connection.cursor()
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'payments_paiement'
    ORDER BY ordinal_position
""")
cols = [row[0] for row in cursor.fetchall()]
print("Existing columns:", cols)

missing = {
    'date_paiement': "timestamp with time zone DEFAULT NOW()",
    'statut': "varchar(40) DEFAULT 'EN_ATTENTE'",
    'montant': "numeric(10,2) DEFAULT 0",
    'commande_id': "bigint NULL",
}

for col, definition in missing.items():
    if col not in cols:
        cursor.execute(f"ALTER TABLE payments_paiement ADD COLUMN IF NOT EXISTS {col} {definition}")
        print(f"Added column: {col}")
    else:
        print(f"Already exists: {col}")

cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'payments_paiement'
    ORDER BY ordinal_position
""")
cols2 = [row[0] for row in cursor.fetchall()]
print("Final columns:", cols2)
