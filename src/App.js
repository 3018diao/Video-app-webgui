import './App.css';
import Peer from 'simple-peer';
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";
import dog from './utils/dog.png';
import io from 'socket.io-client';
import 'antd/dist/antd.min.css';
import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import Input from "antd/es/input/Input";
import { CopyToClipboard } from "react-copy-to-clipboard/lib/Component";
import Webcam from "react-webcam";
const blazeface =require('@tensorflow-models/blazeface');


const socket = io.connect('http://192.168.31.103:5001');

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

  const canvasRef = useRef();
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // const runBodysegment = async () => {
  //   const net = await bodyPix.load();
  //   setInterval(() => {
  //     detect(net);
  //   }, 100)
  // };

  const runDetectFace = async () => {
    const net = await blazeface.load();
    setInterval(() => {
      detect(net);
    }, 3000);
  };

  // const detect = async (net) => {
  //   if (typeof myVideo.current != "undefined" && myVideo.current !== null && myVideo.current.video.readyState === 4) {
  //     const video = myVideo.current.video;
  //     const videoHeight = video.videoHeight;
  //     const videoWidth = video.videoWidth;
  //
  //     myVideo.current.video.width = videoWidth;
  //     myVideo.current.video.height = videoHeight;
  //
  //     canvasRef.current.width = videoWidth;
  //     canvasRef.current.height = videoHeight;
  //
  //     const person = await net.segmentPersonParts(video);
  //     // console.log(person);
  //
  //     const coloredPartImage = bodyPix.toColoredPartMask(person);
  //
  //     bodyPix.drawMask(
  //         canvasRef.current,
  //         video,
  //         coloredPartImage,
  //         0.7,
  //         0,
  //         false
  //     );
  //   }
  // }

  const image = new Image();
  // const image = ({img}) => <img src={"./util/dog.png"} alt="foo" />
  image.src = dog;


  // image.src = 'utils/dog.png';

  const detect = async (net) => {
    if (typeof userVideo.current != "undefined" && userVideo.current !== null && userVideo.current.video.readyState === 4) {
      const video = userVideo.current.video;
      const videoHeight = video.videoHeight;
      const videoWidth = video.videoWidth;

      userVideo.current.video.width = videoWidth;
      userVideo.current.video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const prediction = await net.estimateFaces(video,false);

      const ctx = canvasRef.current.getContext("2d");

      // ctx.drawImage(myVideo, 0,0,400, 300);

      prediction.forEach((pred) => {
        ctx.beginPath();
        ctx.lineWidth = "4";
        ctx.strokeStyle = "blue";

        ctx.drawImage(
            // dog,
            image,
            pred.topLeft[0],
            pred.topLeft[1],
            pred.bottomRight[0] - pred.topLeft[0],
            pred.bottomRight[1] - pred.topLeft[1]
        );
        ctx.stroke();
      });
      // console.log(person);

      // const coloredPartImage = bodyPix.toColoredPartMask(person);
      //
      // bodyPix.drawMask(
      //     canvasRef.current,
      //     video,
      //     coloredPartImage,
      //     0.7,
      //     0,
      //     false
      // );
    }
  }

  runDetectFace();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({video: true, audio: true})
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
      <h1>DOG-zoom</h1>
      <div className='container'>
        <div className='video-container'>
          <header>
            <Webcam
              ref={myVideo}
              style={{
                // position: "absolute",
                marginLeft: "auto",
                marginRight: "auto",
                left: 0,
                right: 0,
                textAlign: "center",
                zindex: 9,
                width: 400,
                height: 300,
              }}
            >
            </Webcam>
            {/*<canvas*/}
            {/*    ref={canvasRef}*/}
            {/*    style={{*/}
            {/*      position: "absolute",*/}
            {/*      marginLeft: "auto",*/}
            {/*      marginRight: "auto",*/}
            {/*      left: 0,*/}
            {/*      right: 0,*/}
            {/*      textAlign: "center",*/}
            {/*      zindex: 9,*/}
            {/*      width: 400,*/}
            {/*      height: 300,*/}
            {/*    }}*/}
            {/*/>*/}
            {/*{*/}
            {/*  stream && (*/}
            {/*    <video*/}
            {/*      playsInline*/}
            {/*      muted*/}
            {/*      autoPlay*/}
            {/*      style={{width: '500px'}}*/}
            {/*      ref={myVideo}*/}
            {/*    />)*/}
            {/*}*/}

            <div>
              {callAccepted && !callEnded ? (
                  <header>
                    <Webcam
                        ref={userVideo}
                        style={{
                          position: "absolute",
                          marginLeft: "auto",
                          marginRight: "auto",
                          left: 0,
                          right: 0,
                          textAlign: "center",
                          zindex: 9,
                          width: 400,
                          height: 300,
                        }}
                    >
                    </Webcam>
                    <canvas
                        ref={canvasRef}
                        style={{
                          position: "absolute",
                          marginLeft: "auto",
                          marginRight: "auto",
                          left: 0,
                          right: 0,
                          textAlign: "center",
                          zindex: 9,
                          width: 400,
                          height: 300,
                        }}
                    />
                  </header>
              ) : null}
            </div>
          </header>
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
