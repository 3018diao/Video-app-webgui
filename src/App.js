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

  const [stream, setStream] = useState();
  const [name, setName] = useState('');
  const [me, setMe] = useState('');
  const [idToCall, setIdToCall] = useState('');
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [userName, setUserName] = useState('');
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        console.log(stream);
        myVideo.current.srcObject = stream;
      })
      .catch((err) => {
        console.log(err);
      });

    socket.on('me', (id) => {
      setMe(id);
    });

    //接听方获取从服务器传递的发起方数据
    socket.on('callUser', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setUserName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  //向另一方拨打视频电话
  const callUser = (idTocall) => {
    //实例化对等连接对象
    const peer = new Peer({
      initiator: true,
      stream: stream,
      trickle: false,
    });
    //传递信令数据
    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: idTocall,
        signalData: data,
        from: me,
        name: name,
      });
    });

    //获取对方的stream
    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    //存储peer对象
    connectionRef.current = peer;
  };
  // 接听通话
  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      stream: stream,
      trickle: false,
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

  //断开通信
  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <div className="App">
      <h1>HY-zoom</h1>
      <div className='container'>
        <div className='video-container'>
          <div>
            {
              stream && (callAccepted && !callEnded ) ? (
                <video
                  playsInline
                  muted
                  autoPlay
                  style={{width: '500px'}}
                  ref={myVideo}
                />) : null
            }

            <div>
              {callAccepted && !callEnded ? (
                <video
                  playsInline
                  muted
                  autoPlay
                  style={{width: '500px'}}
                  ref={userVideo}
                />
              ) : null}
            </div>
          </div>
          <div>
            <Input
              style={{marginBottom: '20px'}}
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <CopyToClipboard text={me}>
              <Button>Your call ID</Button>
            </CopyToClipboard>
            {/*<h5 style={{marginBottom: '2rem'}}>{myID}</h5>*/}
            <Input
              style={{marginBottom: '20px'}}
              placeholder="Input other ID"
              value={idToCall}
              onChange={e => setIdToCall(e.target.value)}
            />
            <div>
              {callAccepted && !callEnded ?
                (<Button danger type="primary" onClick={leaveCall}>
                  End call
                </Button>) :
                (<Button type="primary" onClick={() => callUser(idToCall)}>
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
