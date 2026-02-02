#connection to the neon datastore
import os
import dotenv
#load .env file
dotenv.load_dotenv()
loaded_db_url = os.getenv("psql")


#check it works 
def get_database_url():
    return loaded_db_url