import React, { Component } from "react";
import socketIOClient from "socket.io-client";
import { Map, TileLayer, Marker, Popup } from "react-leaflet";
import Modal from 'react-awesome-modal';
import L from 'leaflet';
import axios from "axios";

const endpoint = "http://127.0.0.1:4001";
const socket = socketIOClient(endpoint);

class App extends Component {
  constructor() {
    super();
    this.state = {
      response: false,
      location: {
        latitude: 0,
        longitude: 0
      },
      zoom: 12,
      name: "",
      stations: [],
      sisible: false,
      report: {}
    };
  }

  generateReport() {
    axios.get(endpoint+'/statistics')
    .then(res => {
      this.setState({
        report : res.data,
        visible : true
      });
      console.log(this.state)
    })
    .catch(console.log());    
  }

  componentDidMount() {
    socket.on("send:stations", (data) => {
      this.setState(data);
    });
  }

  closeModal() {
    this.setState({
      visible : false
    });
  }

  changeStationState(idStation, damaged) {
    socket.emit("lock:station", {id:idStation, damaged:damaged})
    socket.on("lock:station", (data) => {
      this.setState(data)
    })    
  }

  renderPopUp() {
    return (
      <section>
        <input type="button" value="Generate Report" onClick={() => this.generateReport()} />
        <Modal 
          visible={this.state.visible}
          effect="fadeInUp"
          onClickAway={() => this.closeModal()}
        >
          <div>
            <h1>General Report Satations</h1>
            <h3>Less station used</h3>
            {this.renderTableReport(this.state.report.less_used_stations || [])}
            <h3>Top station used</h3>
            {this.renderTableReport(this.state.report.top_used_stations || [])}
            <p>Coming soon.... More info.</p>
            <a href="javascript:void(0);" onClick={() => this.closeModal()}>Close</a>
          </div>
        </Modal>
      </section>
    )
  }

  renderTableData() {
    return this.state.stations.map((station) => {
      const { id, name, empty_slots, free_bikes, damaged } = station 
      return (
        <tr key={id}>
          <td>{name}</td>
          <td>{empty_slots}</td>
          <td>{free_bikes}</td>
          <td className="td-button">
            <button className={damaged ? 'button-red': 'button-green'} onClick={(e) => this.changeStationState(id, damaged)}>
              {damaged ? 'damaged' : 'working'}
            </button>
          </td>
        </tr>
      )
    })
  }

  renderStationsMap() {
    return this.state.stations.map((station) => {
      const {name, latitude, longitude, empty_slots, free_bikes, damaged, extra} = station
      const iconLocation = new L.Icon({
        iconUrl: damaged ? require('./img/pin-red.svg'): free_bikes === 0 ? require('./img/pin-yellow.svg') : require('./img/pin-green.svg'),
        popupAnchor: [3,-46],
        iconSize: new L.Point(25, 25)
      });
      
      return (
        <Marker key={name} position={[latitude, longitude]} icon={iconLocation}>
          <Popup>
            <h2>{name}</h2>
            <div>
              <ul className="ul">
                <li className="li-bike"><h3>Bikes: {free_bikes}</h3></li>
                <li className="li-slot"><h3>Free slots: {empty_slots} </h3></li>
                <li className="li-address"><h3>Address: {extra.address}</h3></li>
              </ul>
            </div>            
          </Popup>          
        </Marker>
      )
    })
  }

  renderTableReport(table) {
    return table.map((station) => {
      const {name, empty_slots, free_bikes} = station;      
      return (
        <ul>
          <li>{name} -- Empty slots: {empty_slots}  --  Free bikes: {free_bikes}</li>
        </ul>
      )
    })
  }

  render() {
    const position = [this.state.location.latitude, this.state.location.longitude]
    return ( 
      <div className="main-div">
        <div className="map-div">
          <h1> {this.state.name} </h1>
          <Map center={position} zoom={this.state.zoom}>
            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {this.renderStationsMap()}
          </Map>
        </div>
        <div>
          <h1 id='title'>Stations</h1>
          <div className="table-div">
            <table id='stations'>
              <tbody>
                <tr>
                  <th>Name</th>
                  <th>Empty Slots</th>
                  <th>Free Bikes</th>
                  <th>Status</th>
                </tr>
                {this.renderTableData()}
              </tbody>
            </table>            
          </div>
          {this.renderPopUp()}
        </div>
      </div>    
    );
  }
}

export default App;
