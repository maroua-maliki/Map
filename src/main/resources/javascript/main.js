const map = L.map('map', { zoomControl: false }).setView([30.4278, -9.5981], 6);
let osm = null;
let neabySearchMarker = null;

// afficher des informations lors d'un clic sur la carte
const popup = L.popup();

function onMapClick(e) {
    const latitude = e.latlng.lat; 
    const longitude = e.latlng.lng;
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    
    fetch(nominatimUrl)
        .then(response => response.json())
        .then(data => {
            const address = data.display_name || "Adresse introuvable";

                map.flyTo([latitude,longitude], 13);
                addSearchMarker(latitude, longitude, address);
        })

}
map.on('click', onMapClick);



// Map Layers
let osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let googleSatelliteLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});



// Add event listener for map resize
window.addEventListener('resize', function() {
    map.invalidateSize(); 
});

// Zooming controls
let zoomIn = () => map.zoomIn();
let zoomOut = () => map.zoomOut();

// Handle map clicks
map.on('click', function(e) {
    const latitude = e.latlng.lat;
    const longitude = e.latlng.lng;

    SidebarController.handleCoordsChange(latitude, longitude);

    // Remove previous marker
    if (neabySearchMarker) neabySearchMarker.remove();

    let icon = L.icon({
        iconUrl: '../images/x-marker.png',
        iconSize: [26, 26],
    });

    neabySearchMarker = L.marker([latitude, longitude], {
        riseOnHover: true,
        bounceOnAdd: false,
        icon: icon,
    }).addTo(map);
    neabySearchMarker.bindPopup("Nearby search coords");
});

// Layer switching functions
function switchToGoogleSatelliteLayer() {
    map.removeLayer(osmLayer);
    map.addLayer(googleSatelliteLayer);
}

function switchToOSMLayer() {
    map.removeLayer(googleSatelliteLayer);
    map.addLayer(osmLayer);
}

// Pan the map to the given location
let searchMarker = null;

function goToLocation(location) {
    map.flyTo([location.location.latitude, location.location.longitude], 13);

    if (searchMarker) {
        searchMarker.remove();
    }

    searchMarker = L.marker([location.location.latitude, location.location.longitude], {
        riseOnHover: true,
        bounceOnAdd: false,
        title: location.displayName.text,
    }).on('click', function () {
        LeafletMapController.handleMarkerClick(JSON.stringify(location));
    }).addTo(map);
}

// Remove marker from map
function removeLocationMarker() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
}

// Get device location
function getDeviceLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            map.flyTo([lat, lon], 13);
            addSearchMarker(lat, lon, "Your Location");
        }, function(error) {
            alert("Error getting your location: " + error.message);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Add search marker
function addSearchMarker(lat, lon, displayName) {
    clearExistingMarkers();
    searchMarker = L.marker([lat, lon]).addTo(map);
    searchMarker.bindPopup(displayName).openPopup();
}

// Place nearby places markers
let circle = null;
let markers = [];
let locationCircles = [];

// Define a red icon
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
let currentRoute = null; 
// Fonction pour tracer un itinéraire entre deux points
function drawRoute1(startLat, startLon, endLat, endLon) {
    const orsApiKey = "5b3ce3597851110001cf62484fc0d9cea35840149c3f2ebc803a379f"; 
    const routeUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${startLon},${startLat}&end=${endLon},${endLat}`;

    fetch(routeUrl)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                const coordinates = data.features[0].geometry.coordinates;
                const routeLatLngs = coordinates.map(coord => [coord[1], coord[0]]);

                // Remove previous route
                if (currentRoute) {
                    map.removeLayer(currentRoute);
                }

                currentRoute = L.polyline(routeLatLngs, {
                    color: 'green',
                    weight: 5,
                }).addTo(map);
            } else {
                alert("Unable to fetch route.");
            }
        })
        .catch(err => {
            alert("Error fetching route: " + err);
        });
}

function placeMarkers(locations, center, radius, markerRadius) {
    if (circle) circle.remove();
    if (markers) markers.forEach(marker => marker.remove());
    if (locationCircles) locationCircles.forEach(circle => circle.remove());
    if (currentRoute) {
        map.removeLayer(currentRoute); 
        currentRoute = null;
    }

    circle = L.circle([center.location.latitude, center.location.longitude], {
        radius: radius,
        fillColor: '#65B741',
        fillOpacity: 0.12,
        color: '#163020',
        weight: 1,
    }).addTo(map);

    markers = locations.map(location => {
        const markerLatLng = L.latLng(location.location.latitude, location.location.longitude);
        const centerLatLng = L.latLng(center.location.latitude, center.location.longitude);

        const distance = centerLatLng.distanceTo(markerLatLng).toFixed(2);

        const marker = L.marker([location.location.latitude, location.location.longitude], {
            riseOnHover: true,
            bounceOnAdd: true,
            icon: redIcon,
            title: location.displayName.text,
        }).on('click', function () {
            const lat = location.location.latitude;
            const lon = location.location.longitude;

            // Fetch address from Nominatim
            let popupContent = `
                <strong>${location.displayName.text}</strong><br>
                <p>Fetching address...</p>
                <p>Latitude: ${lat}</p>
                <p>Longitude: ${lon}</p>
                <p>Distance to center: ${distance} meters</p>
            `;
            this.bindPopup(popupContent).openPopup();

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
                .then(response => response.json())
                .then(data => {
                    const address = data.display_name || "Address not found";
                    popupContent = `
                        <strong>${location.displayName.text}</strong><br>
                        <p>Address: ${address}</p>
                        <p>Latitude: ${lat}</p>
                        <p>Longitude: ${lon}</p>
                        <p>Distance to center: ${distance} meters</p>
                    `;
                    this.setPopupContent(popupContent);
                })
                .catch(error => {
                    console.error('Error fetching address:', error);
                    this.setPopupContent(`
                        <strong>${location.displayName.text}</strong><br>
                        <p>Address: Unable to fetch address</p>
                        <p>Latitude: ${lat}</p>
                        <p>Longitude: ${lon}</p>
                        <p>Distance to center: ${distance} meters</p>
                    `);
                });

            if (currentRoute) {
                map.removeLayer(currentRoute);
            }

            if (searchMarker) {
                const startLat = location.location.latitude;
                const startLon = location.location.longitude;
                const endLat = searchMarker.getLatLng().lat;
                const endLon = searchMarker.getLatLng().lng;

                drawRoute1(startLat, startLon, endLat, endLon);
            } else {
                alert("No search marker found to calculate route.");
            }
        }).addTo(map);

        return marker;
    });

    locationCircles = locations.map(location => {
        return L.circle([location.location.latitude, location.location.longitude], {
            radius: markerRadius,
            fillColor: '#0952ff',
            fillOpacity: 0.12,
            color: '#163020',
            weight: 1,
        }).addTo(map);
    });

    map.fitBounds(circle.getBounds());
}

// Remove places markers
function removePLacesMarkers() {
    if (markers) markers.forEach(marker => marker.remove());
    if (circle) circle.remove();
}

// Search location using OpenStreetMap Nominatim API
function searchLocation(query) {
    const coordinateRegex = /^[-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+$/; // Regex pour valider les coordonnées
    if (coordinateRegex.test(query.trim())) {
        // Recherche par coordonnées
        const [lat, lon] = query.split(' ').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lon)) {
            map.flyTo([lat, lon], 13);
            addSearchMarker(lat, lon, `Coordinates: ${lat}, ${lon}`);
        } else {
            alert("Invalid coordinates. Please enter valid latitude and longitude.");
        }
    } else {
        // Recherche par nom de lieu
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1`;
        clearExistingMarkers();
        fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    map.flyTo([lat, lon], 13);
                    addSearchMarker(lat, lon, data[0].display_name);
                } else {
                    alert("Location not found!");
                }
            })
            .catch(err => alert("Error fetching location: " + err));
    }
}


function searchByCategory() {
    const category = document.getElementById("categorySelect").value;
    if (!category) {
        alert("Veuillez sélectionner une catégorie.");
        return;
    }

    if (!searchMarker) {
        alert("Aucun emplacement de recherche (marqueur bleu) trouvé.");
        return;
    }

    const { lat, lng } = searchMarker.getLatLng();
    const radius = document.getElementById("numberInput").value;
    let tagKey = (category === "hotel") ? "tourism" : "amenity";
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:${radius},${lat},${lng})[${tagKey}=${category}];out;`;

    fetch(overpassUrl)
        .then(response => response.json())
        .then(async data => {
            if (!data.elements || data.elements.length === 0) {
                alert("Aucun lieu trouvé dans cette catégorie.");
                return;
            }

            const locations = data.elements.map(element => ({
                location: { latitude: element.lat, longitude: element.lon },
                displayName: { text: element.tags.name || "Lieu sans nom" },
            }));
            const categorybox = document.getElementById("categorybox").value;
            placeMarkers(locations, { location: { latitude: lat, longitude: lng } }, radius, categorybox);

            await updateLocationTable(locations, { location: { latitude: lat, longitude: lng } });
        })
        .catch(err => {
            alert("Erreur lors de la recherche des lieux : " + err);
            console.error(err);
        });
}


async function updateLocationTable(locations, center) {
    const tableBody = document.getElementById("locationTable").querySelector("tbody");
    tableBody.innerHTML = ""; 

    locations.forEach(location => {
        const { latitude, longitude } = location.location;
        location.distance = L.latLng(latitude, longitude).distanceTo(
            L.latLng(center.location.latitude, center.location.longitude)
        ).toFixed(2); 
    });

    locations.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance)); 

    for (let location of locations) {
        const { latitude, longitude } = location.location;
        const name = location.displayName.text;
        const distance = location.distance; 

        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
            const data = await response.json();
            const address = data.display_name || "Adresse non disponible";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${name}</td>
                <td>${address}</td>
                <td>${distance} m</td>
            `;
            tableBody.appendChild(row);
        } catch (error) {
            console.error("Erreur lors de la récupération des informations :", error);
        }
    }
}



document.getElementById("toggleButton").addEventListener("click", function() {
    var tableContainer = document.querySelector(".table-container");
    var button = document.getElementById("toggleButton");

    if (tableContainer.style.display === "none" || tableContainer.style.display === "") {
        tableContainer.style.display = "block"; 
        button.textContent = "hide"; 
    } else {
        tableContainer.style.display = "none"; 
        button.textContent = "View information of category"; 
    }
});


document.getElementById('downloadPdf').addEventListener('click', function () {
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF();

    const categoryElement = document.getElementById('categorySelect'); 
    const selectedCategory = categoryElement ? categoryElement.value : 'catégorie inconnue';

    const table = document.getElementById('locationTable');
    const rows = table.querySelectorAll('tbody tr');
    const data = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => cell.textContent);
        data.push(rowData);
    });

    pdf.setFontSize(18);
    const pageWidth = pdf.internal.pageSize.getWidth(); 
    const text = `Tableau des lieux de ${selectedCategory}`;
    const textWidth = pdf.getTextWidth(text); 
    const xPosition = (pageWidth - textWidth) / 2; 
    pdf.text(text, xPosition, 20);

    pdf.autoTable({
        startY: 30,
        head: [['Nom', 'Adresse', 'Distance']], 
        body: data, 
    });

    pdf.save(`tableau_lieux_${selectedCategory}.pdf`);
});

// Fonction pour obtenir l’emplacement basé sur l’adresse IP
function getIPLocation() {
    const ipApiUrl = 'http://ip-api.com/json/'; 

    fetch(ipApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                const lat = data.lat;
                const lon = data.lon;
                map.flyTo([lat, lon], 13);
                addSearchMarker(lat, lon, "My location");
            } else {
                alert("Unable to fetch location based on IP.");
            }
        })
        .catch(err => alert("Error fetching IP-based location: " + err));
}
 
// Fonction pour collecter les données des lieux affichés sur la carte
function collectDisplayedLocations() {
    const locationsData = markers.map(marker => {
        const { lat, lng } = marker.getLatLng();
        const distance = marker.options.title.split("Distance: ")[1]; 
        const name = marker.options.title.split("<strong>")[1]?.split("</strong>")[0]; 

        return {
            name: name || "Lieu sans nom",
            address: marker.getPopup()?.getContent() || "Adresse introuvable",
            distance: distance || "Distance inconnue",
        };
    });

    return locationsData;
}
 
//search Box
function incrementS() {
    let input = document.getElementById("numberInput");
    input.value = parseInt(input.value) + 1;
}

function decrementS() {
    let input = document.getElementById("numberInput");
    if (parseInt(input.value) > parseInt(input.min)) {
        input.value = parseInt(input.value) - 1;
    }
}

//category Box 
function incrementC() {
    let input = document.getElementById("categorybox");
    input.value = parseInt(input.value) + 1;
}

function decrementC() {
    let input = document.getElementById("categorybox");
    if (parseInt(input.value) > parseInt(input.min)) {
        input.value = parseInt(input.value) - 1;
    }
}


// Ajouter des contrôles de zoom personnalisés
document.getElementById("zoomIn").addEventListener("click", () => map.zoomIn());
document.getElementById("zoomOut").addEventListener("click", () => map.zoomOut());


const orsApiKey = "5b3ce3597851110001cf62484fc0d9cea35840149c3f2ebc803a379f"; 

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            map.flyTo([lat, lon], 13);
            addSearchMarker(lat, lon, "Votre position actuelle");

            const reverseUrl = `https://api.openrouteservice.org/geocode/reverse?api_key=${orsApiKey}&point.lat=${lat}&point.lon=${lon}`;
            fetch(reverseUrl)
                .then(response => response.json())
                .then(data => {
                    const address = data.features[0].properties.label || "Adresse introuvable";
                })
                .catch(err => {
                    console.error("Erreur de récupération de l'adresse :", err);
                });
        }, function(error) {
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    alert("L'utilisateur a refusé la géolocalisation.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert("La position géographique est indisponible.");
                    break;
                case error.TIMEOUT:
                    alert("La demande de géolocalisation a expiré.");
                    break;
                default:
                    alert("Erreur inconnue : " + error.message);
            }
        });
    } else {
        alert("La géolocalisation n'est pas supportée par ce navigateur.");
    }
}


document.querySelector(".itineraire-button").addEventListener("click", function () {
    document.getElementById("itineraireSidebar").style.display = "block";
});


function closeItineraireSidebar() {
    document.getElementById("itineraireSidebar").style.display = "none";
}


let startMarker = null;
let endMarker = null;
function handleSearchRoute() {
    const startLocation = document.getElementById('startLocation').value.trim();
    const endLocation = document.getElementById('endLocation').value.trim();

    if (!startLocation || !endLocation) {
        alert("Veuillez remplir les deux champs !");
        return;
    }

    clearExistingMarkers();

    const coordRegex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

    const fetchStartLocation = coordRegex.test(startLocation)
        ? Promise.resolve(parseCoordinates(startLocation))
        : fetchLocationFromName(startLocation);

    const fetchEndLocation = coordRegex.test(endLocation)
        ? Promise.resolve(parseCoordinates(endLocation))
        : fetchLocationFromName(endLocation);

    Promise.all([fetchStartLocation, fetchEndLocation])
        .then(([startData, endData]) => {
            if (!startData || !endData) {
                alert("L'une des localisations est introuvable !");
                return;
            }

            const { lat: startLat, lon: startLon, name: startName } = startData;
            const { lat: endLat, lon: endLon, name: endName } = endData;

            if (startMarker) map.removeLayer(startMarker);
            if (endMarker) map.removeLayer(endMarker);

            startMarker = L.marker([startLat, startLon], { title: "Départ" }).addTo(map);
            startMarker.bindPopup(`<b>Départ :</b> ${startName}`).openPopup();

            endMarker = L.marker([endLat, endLon], { title: "Arrivée" }).addTo(map);
            endMarker.bindPopup(`<b>Arrivée :</b> ${endName}`).openPopup();

            drawRoute(startLat, startLon, endLat, endLon);

            const routeInfo = document.getElementById('routeInfo');
            routeInfo.style.display = "flex";
        })
        .catch(err => {
            alert("Erreur lors de la récupération des localisations : " + err);
        });
}

function parseCoordinates(input) {
    const [lat, lon] = input.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lon, name: `Lat: ${lat}, Lon: ${lon}` };
}

function fetchLocationFromName(locationName) {
    return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${locationName}`)
        .then(res => res.json())
        .then(data => {
            if (!data[0]) throw new Error(`Localisation "${locationName}" introuvable !`);
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                name: data[0].display_name
            };
        });
}


function drawRoute(startLat, startLon, endLat, endLon) {
    const orsApiKey = "5b3ce3597851110001cf62484fc0d9cea35840149c3f2ebc803a379f";
    const carRouteUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${startLon},${startLat}&end=${endLon},${endLat}`;
    const walkingRouteUrl = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${orsApiKey}&start=${startLon},${startLat}&end=${endLon},${endLat}`;

    fetch(carRouteUrl)
        .then(res => res.json())
        .then(carData => {
            if (carData.features && carData.features.length > 0) {
                const coordinates = carData.features[0].geometry.coordinates;
                const routeLatLngs = coordinates.map(coord => [coord[1], coord[0]]);

                if (currentRoute) map.removeLayer(currentRoute);
                currentRoute = L.polyline(routeLatLngs, { color: "blue", weight: 5 }).addTo(map);

                const carDistance = (carData.features[0].properties.segments[0].distance / 1000).toFixed(2); 
                const carDuration = (carData.features[0].properties.segments[0].duration / 60).toFixed(0); 
                const carHours = Math.floor(carDuration / 60);
                const carMinutes = carDuration % 60;

                document.getElementById("distanceInfo").innerHTML = ` Distance: ${carDistance} km`;
                document.getElementById("durationInfo").innerHTML = `<i class="bi bi-car-front-fill"></i> Driving time : ${carHours}h ${carMinutes}min <br>`;

                fetch(walkingRouteUrl)
                    .then(res => res.json())
                    .then(walkData => {
                        if (walkData.features && walkData.features.length > 0) {
                            const walkDuration = (walkData.features[0].properties.segments[0].duration / 60).toFixed(0); 
                            const walkHours = Math.floor(walkDuration / 60);
                            const walkMinutes = walkDuration % 60;

                            const walkingInfo = `<i class="bi bi-person-walking"></i> Walking time : ${walkHours}h ${walkMinutes}min`;
                            document.getElementById("durationInfo").innerHTML += `<br>${walkingInfo}`;
                        } else {
                            alert("Impossible de récupérer l'itinéraire à pied !");
                        }
                    })
                    .catch(err => alert("Erreur lors de la récupération de l'itinéraire à pied : " + err));

                map.fitBounds(currentRoute.getBounds());
            } else {
                alert("Impossible de récupérer l'itinéraire en voiture !");
            }
        })
        .catch(err => alert("Erreur lors de la récupération de l'itinéraire en voiture : " + err));
}




function clearExistingMarkers() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
    if (markers) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
    }
    if (locationCircles) {
        locationCircles.forEach(circle => map.removeLayer(circle));
        locationCircles = [];
    }
    if (circle) {
        map.removeLayer(circle);
        circle = null;
    }
    if (currentRoute) {
        map.removeLayer(currentRoute);
        currentRoute = null;
    }
    if (startMarker) {
        map.removeLayer(startMarker);
        startMarker = null;
    }
    if (endMarker) {
        map.removeLayer(endMarker);
        endMarker = null;
    }
    
}



