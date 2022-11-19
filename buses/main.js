// (function () {
//create map in leaflet and tie it to the div called 'theMap'
const map = L.map("theMap").setView([44.650627, -63.59714], 14);

const myIcon = L.icon({
  iconUrl: "bus.png",
  iconSize: [40, 50],
  iconAnchor: [22, 94],
  popupAnchor: [-3, -76]
  //   shadowUrl: "bus.png",
  //   shadowSize: [68, 95],
  //   shadowAnchor: [22, 94]
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// L.marker([44.65069, -63.596537], { icon: myIcon }).addTo(map).bindPopup("This is a sample popup. You can put any html structure in this including extra bus data. You can also swap this icon out for a custom icon. A png file has been provided for you to use if you wish.").openPopup();
// })();

setInterval(() => {
  fetch("https://hrmbusapi.herokuapp.com/")
    .then((res) => res.json())
    .then((data) => {
      console.log(data);

      const filteredData = data.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);
      console.log(filteredData);
      console.log(filteredData.map((obj) => obj.vehicle.trip.routeId));

      const geoJSON = filteredData.map((obj) => {
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [obj.vehicle.position.longitude, obj.vehicle.position.latitude]
          },
          properties: {
            id: obj.id
          }
        };
      });
      console.log(geoJSON);

      geoJSON.map((obj) =>
        L.geoJSON(obj, {
          pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: myIcon });
          }
        }).addTo(map)
      );
    });
}, 7000);
