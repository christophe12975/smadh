import { useState } from "react";


export default function AIChat() {


  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([]);


  const envoyer = async () => {


    if (!message.trim()) return;


    const question = message;


    setMessages([
      ...messages,
      {
        role:"user",
        text:question
      }
    ]);


    setMessage("");


    try {


      const response = await fetch(
        "http://127.0.0.1:8000/chat",
        {
          method:"POST",

          headers:{
            "Content-Type":"application/json"
          },

          body:JSON.stringify({
            message:question
          })
        }
      );


      const data = await response.json();


      setMessages(prev => [
        ...prev,
        {
          role:"ia",
          text:data.response
        }
      ]);


    }
    catch(error){


      setMessages(prev => [
        ...prev,
        {
          role:"ia",
          text:"Impossible de contacter l'IA SMADH."
        }
      ]);

    }


  };



  return (

    <div
      style={{
        background:"#102030",
        padding:"20px",
        borderRadius:"12px",
        marginTop:"30px"
      }}
    >


      <h2>
        Assistant IA SMADH
      </h2>



      <div
        style={{
          minHeight:"150px",
          marginBottom:"15px"
        }}
      >

        {
          messages.map(
            (m,index)=>(

              <p key={index}>

                <b>
                  {
                    m.role==="user"
                    ? "Vous : "
                    : "IA : "
                  }
                </b>

                {m.text}

              </p>

            )
          )
        }


      </div>




      <input

        value={message}

        onChange={
          e=>setMessage(e.target.value)
        }

        placeholder="Posez une question hydrologique..."

        style={{
          width:"70%",
          padding:"10px"
        }}

      />



      <button

        onClick={envoyer}

        style={{
          marginLeft:"10px",
          padding:"10px 20px",
          background:"#00b894",
          color:"white",
          border:"none",
          borderRadius:"8px"
        }}

      >

        Envoyer

      </button>



    </div>

  );

}