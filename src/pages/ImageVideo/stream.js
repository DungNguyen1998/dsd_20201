import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Col, Input, List, Row, Form, Tabs, Tag, Select, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import Map from '../../containers/ModalFlight/Map';

const { TabPane } = Tabs;
const { Option } = Select;
const { Item } = List;
const WS_STREAM_HOST = 'ws://192.168.1.102:7002';
// const WS_STREAM_HOST = 'ws://localhost:7002';

const urlStreams = [
  'https://media.istockphoto.com/videos/aerial-view-of-amazon-rainforest-in-brazil-video-id1169794330',
  'https://media.istockphoto.com/videos/aerial-view-of-amazon-rainforest-in-brazil-video-id1169794330'
];

function Stream() {
  const connection = useRef(null);
  const refVideo = useRef(null);
  const [form] = Form.useForm();
  const [streamId, setStreamId] = useState(null);
  const [payload, setPayload] = useState(null);
  const [downloadLink, setDownloadLink] = useState(null);
  const [cropLink, setCropLink] = useState(null);
  const [currentDrone, setCurrentDrone] = useState({ flightPath: { flightPoints: [] } });
  const [drones, setDrones] = useState([]);
  const [cropLoading, setCropLoading] = useState(false);
  const [campaign, setCampaign] = useState([]);
  const [drone, setDrone] = useState("");

  const[obj,setObj]=useState([]);
    
  const handleObjs = (type) => {
      axios({
          method: "GET",
          url: "https://dsd05-monitored-object.herokuapp.com/monitored-object/",
          params: {
              "type":type
          },
          headers: {
          },

          data: {
          }
      }).then(({ data }) => {
              setObj(data.content[0]);
        
      })
  };

  useEffect(() => {
    form.setFieldsValue({
      startTime: '00:00:00',
      duration: 10
    });
  }, [form]);
  useEffect(()=>{

    handleObjs(localStorage.getItem("project-type"))
    axios({
      method:"GET",
      url:"http://dsd06.herokuapp.com/api/payload",
      params:{
          "droneId":currentDrone.idDrone,
      },
      data:{

      }
  },[currentDrone]).then(({ data }) => {
    axios({
      method:"GET",
      url:"https://dsd06.herokuapp.com/api/payload/"+data[0]?._id,
      params:{
      },
      data:{

      }
  }).then(({ data }) => {
      setPayload(data)
  })
  })

  axios({
    method: "GET",
    url: "http://skyrone.cf:6789/drone/getById/"+currentDrone.idDrone,
    params: {
    },
    headers: {
        "api-token": localStorage.getItem("token"),
        "project-type": localStorage.getItem("project-type")
    },

    data: {
    }
  }).then(({ data }) => {
    setDrone(data)
})

  axios({
    method: "GET",
    url: "http://skyrone.cf:6789/flightItinerary/getByIdDrone/"+currentDrone.idDrone,
  }).then((res)=>{if(res?.data?.data!=null)setCampaign(res?.data?.data[0])})

  },[currentDrone])
  
  // const videoJsOptions = {
  //     autoplay: true,
  //     controls: true,
  //     width: "100%",
  //     sources: [{
  //         src: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  //         type: 'video/mp4'
  //     }]
  // }

  useEffect(() => {
    var websocketEndpoint = WS_STREAM_HOST;
    connection.current = new WebSocket(websocketEndpoint);

    connection.current.onmessage = function (resMessage) {
      var { type, sessionDescription, fileName, link } = JSON.parse(
        resMessage.data
      );
      if (type === 'completed') {
        setDownloadLink(link);
      }
      if (type === 'answer_watch' && refVideo.current.srcObject === null) {
        setStreamId(fileName);
        var rtcConfig = {
          iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
        };
        let peer = new RTCPeerConnection(rtcConfig);
        peer
          .setRemoteDescription(sessionDescription)
          .then(() => peer.createAnswer())
          .then((sdp) => peer.setLocalDescription(sdp))
          .then(() => {
            var message = {
              sessionDescription: peer.localDescription,
              type: 'answer'
            };
            connection.current.send(JSON.stringify(message));
          })
          .catch((error) => {
            console.log('cannot create answer', error);
          });
        peer.ontrack = (event) => {
          console.log('ontrack', event.streams[0]);
          refVideo.current.srcObject = event.streams[0];
        };
        peer.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('onicecandidate event:');
            connection.current.send(
              JSON.stringify({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
              })
            );
          } else {
            console.log('end of candidates');
          }
        };
      }
    };
  }, []);

  const requestStream = () => {
    if (connection.current.readyState === 1) {
      var message = {
        type: 'offer_watch'
      };
      connection.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await axios({
        method: 'GET',
        url: 'http://skyrone.cf:6789/droneState/getAllDroneActiveRealTime'
      });

      const res = await axios({
        method: 'GET',
        url: `http://skyrone.cf:6789/droneState/getParameterFlightRealTime/${data[0].idDrone}`
      });

      console.log({ data });

      setDrones(
        data.map((drone) => ({
          ...drone,
          urlStream: urlStreams[Math.floor(Math.random() * urlStreams.length)],
          label: drone.name,
          value: drone.idDrone
        }))
      );
      setCurrentDrone({
        ...data[0],
        urlStream: urlStreams[Math.floor(Math.random() * urlStreams.length)],
        ...res.data.data,
        label: res.data.data.name,
        value: res.data.data.idDrone
      });
    };

    fetchData();
  }, []);

  const fetchCurrentDrone = async (drone) => {
    const res = await axios({
      method: 'GET',
      url: `http://skyrone.cf:6789/droneState/getParameterFlightRealTime/${drone.idDrone}`
    });

    setCurrentDrone({
      ...res.data.data,
      urlStream: null,
      ...drone
    });
    requestStream();
  };

  const downloadStream = (filename, link) => {
    var element = document.createElement('a');
    element.setAttribute('href', link);
    element.setAttribute('target', '_blank');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  };

  const onCropVideo = async ({ startTime, duration }) => {
    form.getFieldValue('duration');
    const parseDuration = parseInt(duration);
    const validDuration = Math.floor(refVideo.current.currentTime);
    setCropLink(null);
    setCropLoading(true);
    // const { data } = await axios.get(
    //   `http://localhost:7002/stream/crop/${streamId}/${startTime}/${
    //     parseDuration > validDuration ? validDuration : parseDuration
    //   }`
    // );
    const { data } = await axios.get(
      `http://192.168.1.102:7002/stream/crop/${streamId}/${startTime}/${parseDuration > validDuration ? validDuration : parseDuration
      }`
    );
    const { src } = data;
    setCropLoading(false);
    setCropLink(src);
  };

  return (
    <Container>
      <Row gutter={16}>
        <Col md={14}>
          <HeaderList>
            {currentDrone.name
              ? `Stream từ ${currentDrone.name}`
              : 'Loading...'}
          </HeaderList>

          <Row>
          <Col md={24}>
          <strong>Thông tin Drone:</strong>{' '}
          </Col>
            <Col md={12}>
              <strong>Drone: </strong>{' '}
              <span>{drone.name ? drone.name : '...'}</span>
            </Col>
            <Col md={12}>
              <strong>Pin:</strong>{' '}
              <span>
                {currentDrone.percentBattery
                  ? currentDrone.percentBattery
                  : '...'}
                %
              </span>
            </Col>
            <Col md={12}>
              <strong>Tốc độ:</strong>{' '}
              <span>{currentDrone.speed ? currentDrone.speed : '...'}km/h</span>
            </Col>
            <Col md={12}>
              <strong>Độ cao:</strong>{' '}
              <span>
                {currentDrone.heightFlight ? currentDrone.heightFlight : '...'}m
              </span>
            </Col>
            <Col md={24}>
            <strong>Thông tin giám sát:</strong>{' '}
            </Col>
            <Col md={12}>
              <strong>Payload: </strong>{' '}
              <span>
                {payload?.name ? payload?.name : '...'}m
              </span>
            </Col>
            <Col md={12}>
              <strong>Đợt giám sát:</strong>{' '}
              <span>{campaign?.name}</span>
            </Col>
            <Col md={12}>
              <strong>Đối tượng: </strong>{' '}
              <span>
                {obj.name
                  ? obj.name
                  : '...'}
              </span>
            </Col>

          </Row>

          <div
            style={{
              marginTop: '20px'
            }}
          >
            <video
              ref={refVideo}
              controls
              autoPlay
              width="100%"
              src={currentDrone.urlStream}
              style={{ marginBottom: '15px' }}
            />
          </div>

          <Form
            form={form}
            name="horizontal_login"
            layout="inline"
            onFinish={onCropVideo}
          >
            <Form.Item
              name="startTime"
              rules={[
                { required: true, message: 'Vui lòng nhập thời gian bắt đầu!' }
              ]}
            >
              <Input placeholder="Bắt đầu (hh:mm:ss)" />
            </Form.Item>
            <Form.Item
              name="duration"
              rules={[
                { required: true, message: 'Vui lòng nhập độ dài video!' }
              ]}
            >
              <Input type="duration" placeholder="Độ dài video (s)" />
            </Form.Item>
            <Form.Item shouldUpdate={true}>
              {() => (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={cropLoading}
                  disabled={
                    !form.isFieldsTouched(true) ||
                    form.getFieldsError().filter(({ errors }) => errors.length)
                      .length
                  }
                >
                  Cắt video
                </Button>
              )}
            </Form.Item>
            {cropLink && (
              <Form.Item shouldUpdate={true}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => downloadStream(`${streamId}.webm`, cropLink)}
                >
                  Download
                </Button>
              </Form.Item>
            )}
          </Form>
          {downloadLink && (
            <Button
              style={{ marginTop: 16 }}
              type="primary"
              shape="round"
              icon={<DownloadOutlined />}
              onClick={() => downloadStream(`${streamId}.webm`, downloadLink)}
            >
              Download full stream
            </Button>
          )}
        </Col>

        <Col md={10}>
          <TitleList>Danh sách drone đang bay</TitleList>
          <Select
            placeholder="Chọn drone"
            value={currentDrone.value}
            style={{ minWidth: 300 }}
            allowClear
            onChange={(droneId) => {
              fetchCurrentDrone(drones.find(drone => drone.idDrone === droneId));
            }}
          >
            {drones.map(drone => <Option value={drone.value}>{drone.name} - <span>
              {drone.message === "Đang Bay" ? (
                <Tag color="green">Đang bay</Tag>
              ) : (
                  <Tag color="red">Không hoạt động</Tag>
                )}
            </span></Option>)}
          </Select>
          <TitleList style={{ marginTop: "10px" }} >
            Miền giám sát
          </TitleList>
          {/* <List
            dataSource={drones}
            renderItem={(drone) =>
              currentDrone && currentDrone.idDrone === drone.idDrone ? (
                <ActiveItemCustom onClick={() => }>
                </ActiveItemCustom>
              ) : (
                  <ItemCustom onClick={() => fetchCurrentDrone(drone)}>
                    <div>{drone.name}</div>
                    <div>
                      {drone.message === "Đang Bay" ? (
                        <Tag color="green">Đang bay</Tag>
                      ) : (
                          <Tag color="red">Không hoạt động</Tag>
                        )}
                    </div>
                  </ItemCustom>
                )
            }
          /> */}

          <Map flightPath={currentDrone.flightPath} />
        </Col>
      </Row>

    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
`;

const HeaderList = styled.div`
  font-size: 30px;
  margin-bottom: 10px;
  font-weight: 500;
`;
const TitleList = styled.div`
  font-size: 24px;
  margin-bottom: 10px;
  font-weight: 500;
`;

const ItemCustom = styled(Item)`
  cursor: pointer;
`;
const ActiveItemCustom = styled(Item)`
  cursor: pointer;
  background: #d8d8d8;
`;

export default Stream;
