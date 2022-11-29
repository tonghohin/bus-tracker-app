(function () {
  // Create map in leaflet and tie it to the div called 'theMap'.
  const map = L.map("theMap").setView([44.650627, -63.59714], 14);

  // Base map layer for the map.
  L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"]
  }).addTo(map);

  // Icon layers for the bus and user's location icons, to be added to the map.
  const busIcon = L.icon({
    iconUrl: "./icons/bus.png",
    iconSize: [20, 50],
    iconAnchor: [10, 25],
    popupAnchor: [0, 0]
  });
  const locationIcon = L.icon({
    iconUrl: "./icons/person.png",
    iconSize: [40, 40],
    iconAnchor: [15, 30],
    popupAnchor: [0, 0]
  });

  // When the getLocation icon is clicked, display an icon to indicate the user's location. If the L.marker() is put inside the eventlistener function, it will keep creating new icons on the map. Use setLatLng() instead to update the icon's position.
  const getLocation = document.querySelector("#getLocation");
  const locateUser = L.marker(null, { icon: locationIcon });
  getLocation.addEventListener("click", handleGetLocation);

  function handleGetLocation() {
    map
      .locate({ setView: false, watch: true, maxZoom: 15, enableHighAccuracy: true })
      .on("locationfound", (e) => {
        map.setView(e.latlng);
        locateUser.setLatLng(e.latlng);
        locateUser.addTo(map).bindPopup("Your are here!");
        // Remove the 'click' event listener to prevent error
        getLocation.removeEventListener("click", handleGetLocation);
      })
      .on("locationerror", (e) => {
        console.log(e);
        alert("Unable to get your location.");
      });
  }

  // An array of all the HRM bus bus routes, add them as <option> tags into the <select> tag in the HTML file.
  const busRoutes = ["1", "2", "3", "4", "5", "6A", "6B", "6C", "7A", "7B", "8", "9A", "9B", "10", "11", "21", "22", "24", "25", "26", "28", "29", "30A", "30B", "39", "41", "51", "53", "54", "55", "56", "57", "58", "59", "61", "62", "63", "64", "65", "67", "68", "72", "82", "83", "84", "85", "86", "87", "88", "90", "91", "93", "123", "127", "135", "136", "137", "138", "158", "159", "161", "165", "168A", "168B", "178", "179", "182", "183", "185", "186", "194", "196", "320", "330", "370", "401", "415", "433"];
  const select = document.querySelector("select");
  busRoutes.map((busNum) => (select.innerHTML += `<option value="${busNum}">${busNum}</option>`));

  // When the searchBus icon is clicked, display a dropdown menu for the user to choose which bus route to see.
  const searchBus = document.querySelector("#searchBus");
  const form = document.querySelector("form");
  searchBus.addEventListener("click", () => {
    form.classList.toggle("showBusSearchField");
  });

  // When the refresh icon is clicked, the page is reloaded. Mainly for the situation when the user has selected a particular bus route to see, then the user wants to get back all the bus routes.
  const refresh = document.querySelector("#refresh");
  refresh.addEventListener("click", () => {
    window.location.reload();
  });

  // Initial geoJSON layer, pass in an null geoJSON object.
  const busesLocations = L.geoJSON(null, {
    // Setup the custom bus icon.
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: busIcon, rotationAngle: feature.properties.bearing }),
    // Setup the popups and tooltips for the bus icons.
    onEachFeature: (feature, layer) => {
      layer.bindPopup(feature.properties.popupContent);
      layer.bindTooltip(feature.properties.routeId, {
        permanent: true,
        direction: "center"
      });
    }
  });

  // Initial API fetch, use addData() to add the geoJSON objects to the geoJSON layer.
  fetch("https://hrmbusapi.herokuapp.com/")
    .then((res) => res.json())
    .then((data) => {
      console.log("Whole JSON from the API:", data);

      const geoJSON = jsonToGeoJson(data);
      console.log("Initial GeoJSON", geoJSON);

      busesLocations.addData(geoJSON).addTo(map);
      console.log("busesLocations Layers:", busesLocations);
    });

  // New API fetch for every 7 seconds, update the buses' positions with setLatLng() and setRotationAngle().
  setInterval(() => {
    fetch("https://hrmbusapi.herokuapp.com/")
      .then((res) => res.json())
      .then((data) => {
        const geoJSON = jsonToGeoJson(data);

        busesLocations.eachLayer((bus) => {
          geoJSON.map((obj) => {
            if (obj.properties.id === bus.feature.properties.id) {
              bus.setLatLng(obj.geometry.coordinates.reverse());
              bus.setRotationAngle(obj.properties.bearing);
            }
          });
        });
      });
  }, 7000);

  // When the search bus route form is submitted, fetch API and display only the postion of the selected bus route.
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Check against the busRoutes array to ensure the selected bus route exists, alert user if it doesn't. (With the dropdown menu, such circumstance should not happen. Just in case of malicious users.)
    if (busRoutes.includes(select.value)) {
      // Clear all the existing layers (bus icons) of the geoJSON layer.
      busesLocations.clearLayers();

      fetch("https://hrmbusapi.herokuapp.com/")
        .then((res) => res.json())
        .then((data) => {
          // Construct the geoJSON objects only for the selected bus route.
          const geoJSON = jsonToGeoJsonForSearch(data, select.value);
          console.log("Search result geoJSON:", geoJSON);
          // The geoJSON objects may return nothing when the bus is not operating at that time, alert user if that's the case.
          if (geoJSON.length !== 0) {
            busesLocations.addData(geoJSON).addTo(map);
          } else {
            alert("The selected bus route is not operating at this time.");
          }
        });
    } else {
      alert("No such bus route :(");
    }
  });
})();

// For converting the API JSON to geoJSON.
function jsonToGeoJson(json) {
  const filteredData = json.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);

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
        popupContent: `Bus: ${obj.vehicle.trip.routeId}`
      }
    };
  });
  return geoJSON;
}

// For converting the API JSON to geoJSON, with filtering the bus route selected by the user.
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
        popupContent: `Bus: ${obj.vehicle.trip.routeId}`
      }
    };
  });
  return geoJSON;
}
