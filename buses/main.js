(function () {
  //create map in leaflet and tie it to the div called 'theMap'
  var map = L.map("theMap").setView([44.650627, -63.59714], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.marker([44.65069, -63.596537]).addTo(map).bindPopup("This is a sample popup. You can put any html structure in this including extra bus data. You can also swap this icon out for a custom icon. A png file has been provided for you to use if you wish.").openPopup();
})();

fetch("https://hrmbusapi.herokuapp.com/")
  .then((res) => res.json())
  .then((data) => {
    console.log(data);
  });
