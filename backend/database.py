from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db():
    from models.user import User
    from models.transaction import Transaction
    db.create_all()