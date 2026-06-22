const fs = require("fs");

const path = "src/app/portfoy/page.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  '  const [error, setError] = useState("");\n  const [loading, setLoading] = useState(true);',
  '  const [error, setError] = useState("");\n  const [loading, setLoading] = useState(true);\n  const [mapReady, setMapReady] = useState(false);'
);

s = s.replace(
  '        googleMapRef.current = new window.google.maps.Map(mapRef.current, {\n          center,\n          zoom: 12,\n          mapTypeControl: false,\n          streetViewControl: false,\n          fullscreenControl: false,\n          gestureHandling: "greedy",\n        });',
  '        googleMapRef.current = new window.google.maps.Map(mapRef.current, {\n          center,\n          zoom: 12,\n          mapTypeControl: false,\n          streetViewControl: false,\n          fullscreenControl: false,\n          gestureHandling: "greedy",\n        });\n\n        setMapReady(true);'
);

s = s.replace(
  '      markersRef.current.forEach((marker) => marker.setMap?.(null));\n      markersRef.current = [];',
  '      markersRef.current.forEach((marker) => marker.setMap?.(null));\n      markersRef.current = [];\n      setMapReady(false);'
);

s = s.replace(
  /      const priceText = formatCompactPrice\([\s\S]*?      markersRef\.current\.push\(overlay\);/,
`      const isSelected = selectedUnitId === unit.id;

      const svg = \`
        <svg width="48" height="58" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 56C24 56 43 35.6 43 20.5C43 9.73 34.49 1 24 1C13.51 1 5 9.73 5 20.5C5 35.6 24 56 24 56Z" fill="\${isSelected ? "#0B3FB3" : "#1557D6"}" stroke="white" stroke-width="3"/>
          <circle cx="24" cy="21" r="12.5" fill="white"/>
          <path d="M15.8 22.2L24 15.5L32.2 22.2" stroke="#1557D6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18.6 21.4V30.2H29.4V21.4" stroke="#1557D6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 30.2V25.2H26V30.2" stroke="#1557D6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      \`;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: unit.project?.name || "EPH Portföy",
        icon: {
          url: \`data:image/svg+xml;charset=UTF-8,\${encodeURIComponent(svg)}\`,
          scaledSize: new window.google.maps.Size(isSelected ? 52 : 44, isSelected ? 62 : 54),
          anchor: new window.google.maps.Point(isSelected ? 26 : 22, isSelected ? 62 : 54),
        },
        zIndex: isSelected ? 30 : 20,
      });

      marker.addListener("click", () => onSelectUnit(unit.id));
      markersRef.current.push(marker);`
);

s = s.replace(
  '  }, [onSelectUnit, selectedUnitId, showPins, units]);',
  '  }, [mapReady, onSelectUnit, selectedUnitId, showPins, units]);'
);

fs.writeFileSync(path, s, "utf8");
console.log("Portföy haritası temiz patch tamam.");
