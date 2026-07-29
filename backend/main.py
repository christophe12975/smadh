from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai import demander_ia


app = FastAPI(
    title="SMADH AI API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



class Question(BaseModel):
    message: str



@app.get("/")
def accueil():

    return {
        "message": "API SMADH opérationnelle"
    }



@app.post("/chat")
def chat(question: Question):

    message = question.message

    reponse = demander_ia(message)

    return {
        "response": reponse
    }