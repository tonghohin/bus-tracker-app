(function () {
  //create map in leaflet and tie it to the div called 'theMap'
  const map = L.map("theMap").setView([44.650627, -63.59714], 14);

  const busIcon = L.icon({
    iconUrl: "/icons/bus.png",
    iconSize: [20, 50],
    iconAnchor: [10, 25],
    popupAnchor: [0, 0]
  });
  const locationIcon = L.icon({
    iconUrl: "/icons/person.png",
    iconSize: [40, 40],
    iconAnchor: [15, 30],
    popupAnchor: [0, 0]
  });

  L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"]
  }).addTo(map);

  const getLocation = document.querySelector("#getLocation");
  const locateUser = L.marker([0, 0], { icon: locationIcon });
  getLocation.addEventListener("click", () => {
    map
      .locate({ setView: true, watch: true, maxZoom: 15 })
      .on("locationfound", (e) => {
        locateUser.setLatLng(e.latlng);
        locateUser.addTo(map).bindPopup("Your are here!");
      })
      .on("locationerror", (e) => {
        console.log(e);
        alert("Unable to get your location.");
      });
  });

  window.addEventListener("load", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLocation = [position.coords.latitude, position.coords.longitude];
        L.marker(userLocation, { icon: locationIcon }).addTo(map).bindPopup("Your are here!");
      });
    } else {
      alert("Unable to get your location.");
    }
  });

  const busRoutes = ["1", "2", "3", "4", "5", "6A", "6B", "6C", "7A", "7B", "8", "9A", "9B", "10", "11", "21", "22", "24", "25", "26", "28", "29", "30A", "30B", "39", "41", "51", "53", "54", "55", "56", "57", "58", "59", "61", "62", "63", "64", "65", "67", "68", "72", "82", "83", "84", "85", "86", "87", "88", "90", "91", "93", "123", "127", "135", "136", "137", "138", "158", "159", "161", "165", "168A", "168B", "178", "179", "182", "183", "185", "186", "194", "196", "320", "330", "370", "401", "415", "433"];
  const select = document.querySelector("select");
  busRoutes.map((busNum) => (select.innerHTML += `<option value="${busNum}">${busNum}</option>`));

  const searchBus = document.querySelector("#searchBus");
  const form = document.querySelector("form");
  searchBus.addEventListener("click", () => {
    form.classList.toggle("showBusSearchField");
  });

  const refresh = document.querySelector("#refresh");
  refresh.addEventListener("click", () => {
    window.location.reload();
  });

  // L.marker([44.65069, -63.596537], { icon: busIcon }).addTo(map).bindPopup("This is a sample popup. You can put any html structure in this including extra bus data. You can also swap this icon out for a custom icon. A png file has been provided for you to use if you wish.").openPopup();

  fetch("https://hrmbusapi.herokuapp.com/")
    .then((res) => res.json())
    .then((data) => {
      console.log("All data", data);

      //   const filteredData = data.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);
      //   console.log("filteredData", filteredData);
      //   console.log(filteredData.map((obj) => obj.vehicle.trip.routeId));

      const geoJSON = jsonToGeoJson(data);
      console.log("geoJSON", geoJSON);

      let busesLocations = L.geoJSON(geoJSON, {
        pointToLayer: (feature, latlng) => {
          return L.marker(latlng, { icon: busIcon, rotationAngle: feature.properties.bearing });
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(feature.properties.popupContent);
          layer.bindTooltip(feature.properties.routeId, {
            permanent: true,
            direction: "center"
          });
        }
      });
      busesLocations.addTo(map);

      setInterval(() => {
        fetch("https://hrmbusapi.herokuapp.com/")
          .then((res) => res.json())
          .then((data) => {
            const newGeoJSON = jsonToGeoJson(data);

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
      }, 7000);

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log(select.value);
        if (busRoutes.includes(select.value)) {
          busesLocations.clearLayers();

          fetch("https://hrmbusapi.herokuapp.com/")
            .then((res) => res.json())
            .then((data) => {
              console.log("search", jsonToGeoJsonForSearch(data, select.value));
              const jsonToGeoJsonSearch = jsonToGeoJsonForSearch(data, select.value);

              busesLocations = L.geoJSON(jsonToGeoJsonSearch, {
                pointToLayer: (feature, latlng) => {
                  return L.marker(latlng, { icon: busIcon, rotationAngle: feature.properties.bearing });
                },
                onEachFeature: (feature, layer) => {
                  layer.bindPopup(feature.properties.popupContent);
                  layer.bindTooltip(feature.properties.routeId, {
                    permanent: true,
                    direction: "center"
                  });
                }
              });
              busesLocations.addTo(map);
            });
        } else {
          alert("No such bus route :(");
        }
      });
    });
})();

function jsonToGeoJson(json) {
  const filteredData = json.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);
  const geoJSON = json.entity.map((obj) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [obj.vehicle.position.longitude, obj.vehicle.position.latitude]
      },
      properties: {
        id: obj.id,
        routeId: obj.vehicle.trip.routeId,
        bearing: obj.vehicle.position.bearing,
        popupContent: `Bus ${obj.vehicle.trip.routeId}`
      }
    };
  });
  return geoJSON;
}

function jsonToGeoJsonForSearch(json, busRoute) {
  const filteredData = json.entity.filter((obj) => obj.vehicle.trip.routeId === busRoute);
  const geoJSON = filteredData.map((obj) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [obj.vehicle.position.longitude, obj.vehicle.position.latitude]
      },
      properties: {
        id: obj.id,
        routeId: obj.vehicle.trip.routeId,
        bearing: obj.vehicle.position.bearing,
        popupContent: `Bus ${obj.vehicle.trip.routeId}`
      }
    };
  });
  return geoJSON;
}
