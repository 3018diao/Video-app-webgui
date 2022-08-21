import './App.css';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import 'antd/dist/antd.min.css';
import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import Input from "antd/es/input/Input";
import { CopyToClipboard } from "react-copy-to-clipboard/lib/Component";

const socket = io.connect('http://localhost:5001');

function App() {

  const [stream, setStream] = useState(null);
  const [name, setName] = useState('');
  const [myID, setMyID] = useState('');
  const [caller, setCaller] = useState('');
  const [id2Call, setId2Call] = useState('');
  const [userName, setUserName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [receivingCall, setReceivingCall] = useState((false));

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    setName(randomString(5));

    navigator.mediaDevices
      .getUserMedia({audio: true, video: true})
      .then((stream) => {
        setStream(stream);
        // console.log(stream)
        myVideo.current.srcObject = stream;
      })
      .catch(err => {
        console.log(err);
      });

    socket.on('myID', (id) => {
      setMyID(id);
    });

    socket.on('callUser', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setUserName(data.name);
      setCallerSignal(data.signal);
    })

  }, []);

  const callUser = (id2Call) => {
    const peer = new Peer({
      initiator: true,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        user2Call: id2Call,
        signalData: data,
        from: myID,
        name: name,
        trickle: false
      });
    });

    // get other stream
    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      steam: stream,
      trickle: false
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', {
        signal: data,
        to: caller,
      });
    });

    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);

    connectionRef.current = peer;
  };

  const endCall = () => {
    setCallEnded(false);
    connectionRef.current.destory();
  };

  return (
    <div className="App">
      <h1>HY-zoom</h1>
      <div className='container'>
        <div className='video-container'>
          <div>
            {
              stream && (<video playsInline muted autoPlay style={{width: '500px'}} ref={myVideo}/>)
            }

            <div>
              {callAccepted && !callEnded ? (
                <video
                  playsInline
                  muted
                  autoPlay
                  style={{width: '500px'}}
                  ref={userVideo}
                />) : null}
            </div>
          </div>
          <div>
            <Input
              style={{marginBottom: '20px'}}
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <CopyToClipboard text={myID}>
              <Button>Your call ID</Button>
            </CopyToClipboard>
            <h5 style={{marginBottom: '2rem'}}>a{myID}</h5>
            <Input
              style={{marginBottom: '20px'}}
              placeholder="Input other ID"
              value={id2Call}
              onChange={e => setId2Call(e.target.value)}
            />
            <div>
              {callAccepted && !callEnded ?
                (<Button danger type="primary" onClick={endCall}>
                  End call
                </Button>) :
                (<Button type="primary" onClick={() => callUser(id2Call)}>
                  Call
                </Button>)
              }
            </div>
          </div>
          {receivingCall && !callAccepted ? (
            <div>
              <h2>{userName} is calling...</h2>
              <Button type="primary" onClick={answerCall}>Agree call</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function randomString(length) {
  const str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result;
}

export default App;
