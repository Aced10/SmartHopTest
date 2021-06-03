const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const cors = require("cors");
const citybikeurl = "http://api.citybik.es/v2/networks/decobike-miami-beach";

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const app = express();

app.use(index);

const server = http.createServer(app);
const io = socketIo(server);
var stationsLock = [];
var interval;
var corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.get("/statistics", cors(corsOptions), async (req, res) => {
  stations = await getStations();
  if ((!stations.data.network.stations instanceof Array) || stations.length == 0) res.send({ message: "Error stations is not array or is empty" }).status(200);
  let minBikes = Math.min.apply(Math, stations.data.network.stations.map((o) => { return o.free_bikes; }))
  let maxBikes = Math.max.apply(Math, stations.data.network.stations.map((o) => { return o.free_bikes; }))
  let mostUsed = stations.data.network.stations.filter(station => station.free_bikes === minBikes);
  let lessUsed = stations.data.network.stations.filter(station => station.free_bikes === maxBikes);
  let response = {
    top_used_stations:mostUsed,
    less_used_stations:lessUsed,
    message: "The success report generation." 
  }
  res.json(response).status(200);
})

const getStations = () => {
  try {
    return axios.get(citybikeurl);  
  } catch (error) {
    console.error(error);
  }
}

const getStationsAndEmit = async (socket) => {  
  let stations = await getStations();
  stations.data.network.stations = await addLockStationState(stations.data.network.stations);
  socket.emit("send:stations", stations.data.network);
};

const lockStationAndEmit = async (socket) => {  
  socket.on("lock:station", async (data) => {
    let stations = await getStations();
    await lockStation(data.id);
    stations.data.network.stations = await addLockStationState(stations.data.network.stations);
    io.sockets.emit("lock:station", stations.data.network);
  });
}

const searchStationInLocks = async (id) => {
  return stationsLock.indexOf(id);
}

const lockStation = async (id) => {
  console.log(stationsLock)
  let position = await searchStationInLocks(id);
  if (position > -1) {
    stationsLock.splice(position, 1);
  } else {
    stationsLock.push(id);
  }
}

const addLockStationState = async (stations) => {
  stations.forEach( (station) => {
    station.damaged = false;
    stationsLock.forEach( (lockId) => {
      if (station.id === lockId) station.damaged = true;
    });
  }) 
  
  return stations;
}

io.on("connection", socket => {
  var socketId = socket.id;
  var clientIp = socket.request.connection.remoteAddress;
  console.log('New connection ' + socketId + ' from ' + clientIp);
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => getStationsAndEmit(socket), 1000);
  lockStationAndEmit(socket);
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));