// (function () {
//create map in leaflet and tie it to the div called 'theMap'
const map = L.map("theMap").setView([44.650627, -63.59714], 14);

const busIcon = L.icon({
  iconUrl: "bus.png",
  iconSize: [20, 50],
  iconAnchor: [20, 25],
  popupAnchor: [0, 0]
});

// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);

L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
  maxZoom: 20,
  subdomains: ["mt0", "mt1", "mt2", "mt3"]
}).addTo(map);

map
  .locate({ setView: false, watch: false })
  .on("locationfound", (e) => {
    L.marker([e.latitude, e.longitude]).addTo(map).bindPopup("Your are here!");
  })
  .on("locationerror", (e) => {
    console.log(e);
    alert("Location access denied.");
  });

// L.marker([44.65069, -63.596537], { icon: busIcon }).addTo(map).bindPopup("This is a sample popup. You can put any html structure in this including extra bus data. You can also swap this icon out for a custom icon. A png file has been provided for you to use if you wish.").openPopup();
// })();

fetch("https://hrmbusapi.herokuapp.com/")
  .then((res) => res.json())
  .then((data) => {
    console.log(data);

    const filteredData = data.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);
    console.log("filteredData", filteredData);
    console.log(filteredData.map((obj) => obj.vehicle.trip.routeId));

    const geoJSON = filteredData.map((obj) => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [obj.vehicle.position.longitude, obj.vehicle.position.latitude]
        },
        properties: {
          id: obj.id,
          bearing: obj.vehicle.position.bearing,
          popupContent: `Bus ${obj.vehicle.trip.routeId}`
        }
      };
    });
    console.log(geoJSON);

    const busesLocations = L.geoJSON(geoJSON, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: busIcon, rotationAngle: feature.properties.bearing });
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.popupContent);
      }
    }).addTo(map);
    console.log(busesLocations);

    setInterval(() => {
      fetch("https://hrmbusapi.herokuapp.com/")
        .then((res) => res.json())
        .then((data) => {
          const filteredData = data.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);
          const newGeoJSON = filteredData.map((obj) => {
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [obj.vehicle.position.longitude, obj.vehicle.position.latitude]
              },
              properties: {
                id: obj.id,
                bearing: obj.vehicle.position.bearing,
                popupContent: `Bus ${obj.vehicle.trip.routeId}`
              }
            };
          });
          //   console.log("newGeoJSON", newGeoJSON);

          //   busesLocations.eachLayer((bus) => console.log("inner", bus));
          //   busesLocations.eachLayer((bus) => console.log("inner", bus.feature.properties.id));
          busesLocations.eachLayer((bus) => {
            newGeoJSON.map((obj) => {
              if (obj.properties.id === bus.feature.properties.id) {
                bus.setLatLng(obj.geometry.coordinates.reverse());
                bus.setRotationAngle(obj.properties.bearing);
              }
            });
          });
        });
    }, 5000);
  });
