import './App.css';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import 'antd/dist/antd.min.css';
import { useEffect, useRef, useState } from "react";
import { Button } from "antd";

const socket = io.connect('http://localhost:5001');

function App() {

  const [stream, setStream] = useState(null);

  const myVideo = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({audio: true})
      .then((stream) => {
        setStream(stream);
        console.log(stream)
        myVideo.current.srcObject = stream;
      });
  }, []);

  return (
    <div className="App">
      <h1>HY-zoom</h1>
      <div className='container'>
        <div className='video-container'>
          <div>
            <video playsInline muted autoPlay style={{width: '500px'}} ref={myVideo}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
