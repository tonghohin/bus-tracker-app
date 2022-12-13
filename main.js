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
  getLocation.addEventListener(
    "click",
    () => {
      map
        .locate({ setView: true, watch: true, maxZoom: 15, enableHighAccuracy: true })
        .on("locationfound", (e) => {
          locateUser.setLatLng(e.latlng);
          locateUser.addTo(map).bindPopup("You're are here!");
        })
        .on("locationerror", (e) => {
          alert("Unable to get your location.");
        });
    },
    { once: true }
  );

  // An array of all the HRM bus bus routes, add them as <option> tags into the <select> tag in the HTML file.
  const busRoutes = ["1", "2", "3", "4", "5", "6A", "6B", "6C", "7A", "7B", "8", "9A", "9B", "10", "21", "22", "24", "25", "26", "28", "29", "30A", "30B", "39", "41", "51", "53", "54", "55", "56", "57", "58", "59", "61", "62", "63", "64", "65", "67", "68", "72", "82", "83", "84", "85", "86", "87", "88", "90", "91", "93", "123", "127", "135", "136", "137", "138", "158", "159", "161", "165", "168A", "168B", "178", "179", "182", "183", "185", "186", "194", "196", "320", "330", "370", "401", "415", "433"];
  const select = document.querySelector("select");
  busRoutes.map((busNum) => (select.innerHTML += `<option value="${busNum}">${busNum}</option>`));

  // When the searchBus icon is clicked, display a dropdown menu for the user to choose which bus route to see.
  const searchBus = document.querySelector("#searchBus");
  const form = document.querySelector("form");
  searchBus.addEventListener("click", () => {
    form.classList.toggle("showBusSearchField");
  });

  // When the refresh icon is clicked, the page is reloaded. Mainly for the situation when the user has selected a particular bus route to see, but then the user wants to get back all the bus routes.
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
  fetch("https://hrmbusapi.onrender.com/")
    .then((res) => res.json())
    .then((data) => {
      const geoJSON = jsonToGeoJson(data);
      busesLocations.addData(geoJSON).addTo(map);
    });

  // New API fetch for every 5 seconds, update the buses' positions with setLatLng() and setRotationAngle().
  setInterval(() => {
    fetch("https://hrmbusapi.onrender.com/")
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
  }, 10000);

  // When the search bus route form is submitted, fetch API and display only the postion of the selected bus route.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Check against the busRoutes array to ensure the selected bus route exists, alert user if it doesn't. (With the dropdown menu, such circumstance should not happen. Just in case of malicious users.)
    if (busRoutes.includes(select.value)) {
      // Clear all the existing layers (bus icons) of the geoJSON layer.
      busesLocations.clearLayers();
      fetch("https://hrmbusapi.onrender.com/")
        .then((res) => res.json())
        .then((data) => {
          // Construct the geoJSON objects only for the selected bus route.
          const geoJSON = jsonToGeoJson(data, select.value);
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

// For converting the API JSON to geoJSON. The "busRoute" parameter should only be passed in when the user searches a certain bus route, when its not passed in, the default value is false.
function jsonToGeoJson(json, busRoute = false) {
  let filteredData;
  if (busRoute) {
    // Only get the data of the bus route that's searched by the user
    filteredData = json.entity.filter((obj) => obj.vehicle.trip.routeId === busRoute);
  } else {
    // Get the 1 - 10 bus route data
    filteredData = json.entity.filter((obj) => parseInt(obj.vehicle.trip.routeId) < 11);
  }
  const geoJSON = filteredData.map((obj) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [obj.vehicle.position.longitude, obj.vehicle.position.latitude]
      },
      properties: {
        id: obj.id,
        show: true,
        routeId: obj.vehicle.trip.routeId,
        directionId: obj.vehicle.trip.directionId,
        bearing: obj.vehicle.position.bearing,
        popupContent: getDestination(obj.vehicle.trip.routeId, obj.vehicle.trip.directionId)
      }
    };
  });
  return geoJSON;
}

// An array of the destinations of each route.
const routeDestinations = [
  { routeId: "1", destination: "1 SPRING GARDEN TO MUMFORD TERM", directionId: 0 },
  { routeId: "1", destination: "1 SPRING GARDEN TO BRIDGE TERM", directionId: 1 },
  { routeId: "2", destination: "2 WATER ST TERMINAL VIA NORTH", directionId: 0 },
  { routeId: "2", destination: "2 LACEWOOD TERMINAL VIA MAIN AVE", directionId: 1 },
  { routeId: "3", destination: "3 BURNSIDE VIA BRIDGE TERMINAL", directionId: 0 },
  { routeId: "3", destination: "3 LACEWOOD TERMINAL VIA MUMFORD TERMINAL", directionId: 1 },
  { routeId: "4", destination: "4 ST. MARYS AND DALHOUSIE VIA ROBIE", directionId: 0 },
  { routeId: "4", destination: "4 LACEWOOD TERMINAL VIA ROBIE", directionId: 1 },
  { routeId: "5", destination: "5 SCOTIA SQUARE VIA PORTLAND", directionId: 0 },
  { routeId: "5", destination: "5 PORTLAND HILLS TERM VIA PORTLAND ST", directionId: 1 },
  { routeId: "8", destination: "8 DOWNTOWN HALIFAX VIA SPRING GARDEN", directionId: 0 },
  { routeId: "8", destination: "8 SACKVILLE TERMINAL", directionId: 1 },
  { routeId: "10", destination: "10 DALHOUSIE VIA SPRING GARDEN", directionId: 0 },
  { routeId: "10", destination: "10 WESTPHAL VIA MICMAC", directionId: 1 },
  { routeId: "21", destination: "21 LACEWOOD TERMINAL VIA BAYERS LAKE", directionId: 0 },
  { routeId: "21", destination: "21 TIMBERLEA VIA BAYERS LAKE", directionId: 1 },
  { routeId: "22", destination: "22 ARMDALE TO MUMFORD TERMINAL", directionId: 0 },
  { routeId: "22", destination: "22 ARMDALE TO RAGGED LAKE", directionId: 1 },
  { routeId: "24", destination: "24 SAINT MARYS VIA OXFORD", directionId: 0 },
  { routeId: "24", destination: "24 LEIBLIN PARK VIA MUMFORD TERMINAL", directionId: 1 },
  { routeId: "25", destination: "25 MUMFORD TERMINAL", directionId: 0 },
  { routeId: "25", destination: "25 GOVERNORS BROOK", directionId: 1 },
  { routeId: "26", destination: "26 MUMFORD TERMINAL", directionId: 0 },
  { routeId: "26", destination: "26 SPRINGVALE", directionId: 1 },
  { routeId: "28", destination: "28 MUMFORD TERMINAL VIA WASHMILL LAKE", directionId: 0 },
  { routeId: "28", destination: "28 LACEWOOD TERMINAL VIA WASHMILL LAKE", directionId: 1 },
  { routeId: "29", destination: "29 POINT PLEASANT VIA HOLLIS", directionId: 0 },
  { routeId: "29", destination: "29 BAYERS ROAD CENTRE VIA MUMFORD", directionId: 1 },
  { routeId: "39", destination: "39 BRIDGE TERMINAL VIA MACKAY BRIDGE", directionId: 0 },
  { routeId: "39", destination: "39 LACEWOOD TERMINAL VIA MACKAY BRIDGE", directionId: 1 },
  { routeId: "41", destination: "41 DALHOUSIE", directionId: 0 },
  { routeId: "41", destination: "41 BRIDGE TERMINAL", directionId: 1 },
  { routeId: "51", destination: "51 WINDMILL TO BRIDGE TERMINAL", directionId: 0 },
  { routeId: "51", destination: "51 WINDMILL TO OCEAN BREEZE", directionId: 1 },
  { routeId: "53", destination: "53 ALDERNEY VIA BRIDGE TERMINAL", directionId: 0 },
  { routeId: "53", destination: "53 HIGHFIELD TERMINAL VIA ALBRO LAKE", directionId: 1 },
  { routeId: "54", destination: "54 BRIDGE TERMINAL VIA ALDERNEY", directionId: 0 },
  { routeId: "54", destination: "54 MONTEBELLO VIA MICMAC TERMINAL", directionId: 1 },
  { routeId: "55", destination: "55 BRIDGE TERMINAL VIA ALDERNEY", directionId: 0 },
  { routeId: "55", destination: "55 PORT WALLACE VIA MICMAC TERMINAL", directionId: 1 },
  { routeId: "56", destination: "56 BRIDGE TERMINAL VIA MICMAC", directionId: 0 },
  { routeId: "56", destination: "56 DARTMOUTH CROSSING VIA MICMAC", directionId: 1 },
  { routeId: "57", destination: "57 PENHORN TERMINAL VIA PORTLAND ESTATES", directionId: 0 },
  { routeId: "57", destination: "57 PORTLAND HILLS TERMINAL", directionId: 1 },
  { routeId: "58", destination: "58 PENHORN TERMINAL VIA WOODLAWN", directionId: 0 },
  { routeId: "58", destination: "58 PORTLAND HILLS TERMINAL VIA WOODLAW", directionId: 1 },
  { routeId: "59", destination: "59 PORTLAND HILLS TERMINAL", directionId: 0 },
  { routeId: "59", destination: "59 COLBY VILLAGE", directionId: 1 },
  { routeId: "61", destination: "61 PORTLAND HILLS VIA FOREST HILLS", directionId: 0 },
  { routeId: "61", destination: "61 NORTH PRESTON VIA FOREST HILLS", directionId: 1 },
  { routeId: "62", destination: "62 BRIDGE TERM VIA MANOR PARK", directionId: 0 },
  { routeId: "62", destination: "62 GASTON VIA MANOR PARK", directionId: 1 },
  { routeId: "63", destination: "63 PENHORN TERMINAL VIA MT EDWARD", directionId: 0 },
  { routeId: "63", destination: "63 PORTLAND HILLS VIA MT EDWARD", directionId: 1 },
  { routeId: "64", destination: "64 HIGHFIELD TERMINAL VIA BURNSIDE", directionId: 0 },
  { routeId: "64", destination: "64 WRIGHTS COVE VIA BURNSIDE", directionId: 1 },
  { routeId: "65", destination: "65 PORTLAND HILLS TERMINAL", directionId: 0 },
  { routeId: "65", destination: "65 ASTRAL DRIVE VIA CALDWELL", directionId: 1 },
  { routeId: "67", destination: "67 MICMAC VIA TACOMA", directionId: 0 },
  { routeId: "67", destination: "67 WOODSIDE VIA BAKER", directionId: 1 },
  { routeId: "68", destination: "68 PORTLAND HILLS TERM VIA AUBURN D", directionId: 0 },
  { routeId: "68", destination: "68 CHERRY BROOK VIA AUBURN DR", directionId: 1 },
  { routeId: "72", destination: "72 DARTMOUTH CROSSING VIA WRIGHT", directionId: 0 },
  { routeId: "72", destination: "72 PORTLAND HILLS VIA WOODLAWN", directionId: 1 },
  { routeId: "82", destination: "82 COBEQUID TERMINAL VIA FIRST LAKE", directionId: 0 },
  { routeId: "82", destination: "82 SACKVILLE TERMINAL VIA FIRST LAKE", directionId: 1 },
  { routeId: "83", destination: "83 SACKVILLE TERMINAL", directionId: 0 },
  { routeId: "83", destination: "83 SPRINGFIELD", directionId: 1 },
  { routeId: "84", destination: "84 DOWNTOWN TO SCOTIA SQUARE", directionId: 0 },
  { routeId: "84", destination: "84 SACKVILLE TERMINAL VIA GLENDALE", directionId: 1 },
  { routeId: "85", destination: "85 SACKVILLE TERMINAL", directionId: 0 },
  { routeId: "85", destination: "85 MILLWOOD", directionId: 1 },
  { routeId: "86", destination: "86 SACKVILLE TERMINAL", directionId: 0 },
  { routeId: "86", destination: "86 BEAVER BANK", directionId: 1 },
  { routeId: "87", destination: "87 BRIDGE TERMINAL", directionId: 0 },
  { routeId: "87", destination: "87 SACKVILLE TERMINAL", directionId: 1 },
  { routeId: "88", destination: "88 SACKVILLE TERMINAL", directionId: 0 },
  { routeId: "88", destination: "88 BEDFORD COMMONS", directionId: 1 },
  { routeId: "90", destination: "90 WATER ST TERMINAL VIA UNIVERSITY", directionId: 0 },
  { routeId: "90", destination: "90 WEST BEDFORD VIA LARRY UTECK", directionId: 1 },
  { routeId: "91", destination: "91 MUMFORD TERMINAL", directionId: 0 },
  { routeId: "91", destination: "91 WEST BEDFORD VIA STARBOARD", directionId: 1 },
  { routeId: "93", destination: "93 DOWNTOWN HALIFAX VIA LADY HAMMOND", directionId: 0 },
  { routeId: "93", destination: "93 COBEQUID TERMINAL VIA LADY HAMMOND", directionId: 1 },
  { routeId: "123", destination: "123 TIMBERLEA EXPRESS TO SCOTIA SQUARE", directionId: 0 },
  { routeId: "123", destination: "123 TIMBERLEA EXPRESS", directionId: 1 },
  { routeId: "127", destination: "127 EXPRESS TO SCOTIA SQUARE", directionId: 0 },
  { routeId: "127", destination: "127 COWIE HILL EXPRESS", directionId: 1 },
  { routeId: "135", destination: "135 FLAMINGO EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "135", destination: "135 FLAMINGO EXPRESS VIA LACEWOOD TERM", directionId: 1 },
  { routeId: "136", destination: "136 FARNHAM GATE EXP TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "136", destination: "136 FARNHAM GATE EXP VIA LACEWOOD TERM", directionId: 1 },
  { routeId: "137", destination: "137 CLAYTON PARK EXP TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "137", destination: "137 CLAYTON PARK EXP VIA LACEWOOD TERM", directionId: 1 },
  { routeId: "138", destination: "138 PARKLAND EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "138", destination: "138 PARKLAND EXPRESS VIA LACEWOOD TERM", directionId: 1 },
  { routeId: "158", destination: "158 EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "158", destination: "158 WOODLAWN EXPRESS VIA MOUNT EDWARD", directionId: 1 },
  { routeId: "159", destination: "159 EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "159", destination: "159 COLBY EXPRESS VIA PORTLAND", directionId: 1 },
  { routeId: "161", destination: "161 EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "161", destination: "161 NORTH PRESTON EXPRESS VIA PORTLAND", directionId: 1 },
  { routeId: "165", destination: "165 EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "165", destination: "165 CALDWELL EXPRESS VIA PORTLAND", directionId: 1 },
  { routeId: "178", destination: "178 WOODSIDE FERRY EXPRESS", directionId: 0 },
  { routeId: "178", destination: "178 MOUNT EDWARD EXPRESS", directionId: 1 },
  { routeId: "179", destination: "179 WOODSIDE FERRY EXPRESS", directionId: 0 },
  { routeId: "179", destination: "179 COLE HARBOUR EXPRESS", directionId: 1 },
  { routeId: "182", destination: "182 FIRST LAKE EXPRESS TO SUMMER STREET", directionId: 0 },
  { routeId: "182", destination: "182 FIRST LAKE EXPRESS VIA COBEQUID TERM", directionId: 1 },
  { routeId: "183", destination: "183 DOWNTOWN EXPRESS TO SUMMER STREET", directionId: 0 },
  { routeId: "183", destination: "183 SPRINGFIELD EXPRESS VIA SACKVILLE", directionId: 1 },
  { routeId: "185", destination: "185 DOWNTOWN EXPRESS TO SUMMER STREET", directionId: 0 },
  { routeId: "185", destination: "185 MILLWOOD EXPRESS VIA SACKVILLE TERM", directionId: 1 },
  { routeId: "186", destination: "186 DOWNTOWN EXPRESS TO SUMMER STREET", directionId: 0 },
  { routeId: "186", destination: "186 BEAVER BANK EXPRESS VIA SACKVILLE", directionId: 1 },
  { routeId: "194", destination: "194 DOWNTOWN EXPRESS TO SUMMER STREET", directionId: 0 },
  { routeId: "194", destination: "194 WEST BEDFORD EXPRESS", directionId: 1 },
  { routeId: "196", destination: "196 DOWNTOWN EXPRESS TO SUMMER STREET", directionId: 0 },
  { routeId: "196", destination: "196 BASINVIEW ROCKMANOR EXPRESS", directionId: 1 },
  { routeId: "320", destination: "320 DOWNTOWN HFX VIA BRIDGE TERM", directionId: 0 },
  { routeId: "320", destination: "320 AIRPORT VIA FALL RIVER", directionId: 1 },
  { routeId: "330", destination: "330 DOWNTOWN HFX TO ALBEMARLE ST", directionId: 0 },
  { routeId: "330", destination: "330 TANTALLON ONLY", directionId: 1 },
  { routeId: "370", destination: "370 DOWNTOWN HFX VIA BRIDGE TERM", directionId: 0 },
  { routeId: "370", destination: "370 PORTERS LAKE", directionId: 1 },
  { routeId: "401", destination: "401 PORTLAND HILLS TERMINAL", directionId: 0 },
  { routeId: "401", destination: "401 PORTERS LAKE VIA EAST PRESTON", directionId: 1 },
  { routeId: "415", destination: "415 MUMFORD TERMINAL", directionId: 0 },
  { routeId: "415", destination: "415 PURCELLS COVE", directionId: 1 },
  { routeId: "433", destination: "433 LACEWOOD TERMINAL", directionId: 0 },
  { routeId: "433", destination: "433 TANTALLON VIA HAMMONDS PLAINS", directionId: 1 },
  { routeId: "168A", destination: "168A EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "168A", destination: "168A AUBURN EXPRESS VIA PORTLAND", directionId: 1 },
  { routeId: "168B", destination: "168B EXPRESS TO UNIVERSITY AVE", directionId: 0 },
  { routeId: "168B", destination: "168B CHERRY BROOK EXPRESS VIA PORTLAND", directionId: 1 },
  { routeId: "30A", destination: "30A LACEWOOD TERMINAL", directionId: 0 },
  { routeId: "30A", destination: "30A PARKLAND", directionId: 1 },
  { routeId: "30B", destination: "30B LACEWOOD TERMINAL", directionId: 0 },
  { routeId: "30B", destination: "30B DUNBRACK", directionId: 1 },
  { routeId: "6A", destination: "6A BRIDGE TERMINAL VIA PLEASANT", directionId: 0 },
  { routeId: "6A", destination: "6A WOODSIDE VIA PLEASANT", directionId: 1 },
  { routeId: "6B", destination: "6B BRIDGE TERMINAL VIA WOODSIDE", directionId: 0 },
  { routeId: "6B", destination: "6B EASTERN PASSAGE VIA WOODSIDE", directionId: 1 },
  { routeId: "6C", destination: "6C BRIDGE TERMINAL VIA WOODSIDE", directionId: 0 },
  { routeId: "6C", destination: "6C HERITAGE HILLS VIA WOODSIDE", directionId: 1 },
  { routeId: "7A", destination: "7A SCOTIA SQUARE VIA GOTTINGEN", directionId: 0 },
  { routeId: "7A", destination: "7A ROBIE", directionId: 1 },
  { routeId: "7B", destination: "7B SCOTIA SQUARE VIA ROBIE", directionId: 0 },
  { routeId: "7B", destination: "7B NOVALEA VIA GOTTINGEN", directionId: 1 },
  { routeId: "9A", destination: "9A DOWNTOWN VIA SPRING GARDEN", directionId: 0 },
  { routeId: "9A", destination: "9A GREYSTONE FOTHERBY VIA MUMFORD", directionId: 1 },
  { routeId: "9B", destination: "9B DOWNTOWN VIA SPRING GARDEN", directionId: 0 },
  { routeId: "9B", destination: "9B HERRING COVE VIA MUMFORD TERMINAL", directionId: 1 }
];

// For getting the destination of the bus route by matching with the routeDestinations array. Since some bus routes in the API JSON don't have a directionId and I'll get "undefined" when I try to access their directionId, so the "busDirection" has a default value of 0 when the directionId is "undefined".
function getDestination(busRoute, busDirection = 0) {
  return routeDestinations.filter((obj) => obj.routeId === busRoute && obj.directionId === busDirection)[0].destination;
}
