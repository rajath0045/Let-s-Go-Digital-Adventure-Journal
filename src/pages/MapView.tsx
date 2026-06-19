import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { questService, type Quest, type QuestStatus } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Navigation, Info } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon paths in bundle environments
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Simple client-side geocoder cache to avoid API keys and rate limits
const GEOCODE_CACHE: Record<string, [number, number]> = {
  'kyoto, japan': [35.0116, 135.7681],
  'tokyo, japan': [35.6762, 139.6503],
  'mt fuji, japan': [35.3606, 138.7274],
  'new york, usa': [40.7128, -74.0060],
  'london, uk': [51.5074, -0.1278],
  'paris, france': [48.8566, 2.3522],
  'sydney, australia': [-33.8688, 151.2093],
  'rome, italy': [41.9028, 12.4964],
  'cairo, egypt': [30.0444, 31.2357],
  'iceland': [64.9631, -19.0208],
  'machu picchu, peru': [-13.1631, -72.5450]
};

export const MapView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | QuestStatus>('All');
  const [geocodedQuests, setGeocodedQuests] = useState<(Quest & { lat: number; lng: number })[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Fetch quests
  const { data: quests = [] } = useQuery<Quest[]>({
    queryKey: ['quests'],
    queryFn: questService.getQuests,
    enabled: !!user
  });

  // Filter location-based quests
  const locationQuests = quests.filter(q => q.location && q.location.trim().length > 0);

  // Geocode locations to coordinates
  useEffect(() => {
    if (locationQuests.length === 0) {
      setGeocodedQuests([]);
      return;
    }

    const geocodeAll = async () => {
      setIsGeocoding(true);
      const results: (Quest & { lat: number; lng: number })[] = [];

      for (const quest of locationQuests) {
        const loc = quest.location!.trim();
        const locLower = loc.toLowerCase();

        // 1. Check local coordinates cache
        if (GEOCODE_CACHE[locLower]) {
          const [lat, lng] = GEOCODE_CACHE[locLower];
          results.push({ ...quest, lat, lng });
          continue;
        }

        // 2. Perform a lightweight search using free OpenStreetMap Nominatim API
        try {
          // Pause slightly to respect Nominatim usage policy (1 request per second max, but we check cache first)
          await new Promise(resolve => setTimeout(resolve, 300));
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}&limit=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              
              // Cache it
              GEOCODE_CACHE[locLower] = [lat, lng];
              results.push({ ...quest, lat, lng });
              continue;
            }
          }
        } catch (e) {
          console.error(`Geocoding failed for location: ${loc}`, e);
        }

        // 3. Fallback (place slightly offset from origin to avoid overlap)
        const offset = Math.random() * 0.1 - 0.05;
        results.push({ 
          ...quest, 
          lat: 30.0 + offset, 
          lng: 0.0 + offset 
        });
      }

      setGeocodedQuests(results);
      setIsGeocoding(false);
    };

    geocodeAll();
  }, [quests]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current).setView([20, 0], 2);
    
    // Add beautiful parchment/vintage style map tiles (OpenStreetMap Carto DB Positron Dark or Light fits journal perfectly)
    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    markerGroupRef.current = markerGroup;

    return () => {
      map.remove();
    };
  }, []);

  // Update Tiles when Theme switches
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Re-add tiles based on dark class
    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    // Remove old tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);
  }, [quests]); // Sync theme redraw triggers

  // Plot Markers on statusFilter and geocodedQuests change
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    // Clear existing markers
    markerGroup.clearLayers();

    // Filter quests to plot (keep only Pending and Completed)
    const plots = geocodedQuests
      .filter(q => q.status === 'Pending' || q.status === 'Completed')
      .filter(q => statusFilter === 'All' || q.status === statusFilter);

    if (plots.length === 0) return;

    // Markers array to fit bounds
    const bounds: L.LatLngExpression[] = [];

    plots.forEach(q => {
      // Determine marker color based on status (Pending: Red, Completed: Green)
      const markerHtml = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md ${
          q.status === 'Completed'
            ? 'bg-green-500'
            : 'bg-red-500'
        } text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([q.lat, q.lng], { icon: customIcon }).addTo(markerGroup);
      bounds.push([q.lat, q.lng]);

      // Popups
      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 font-sans text-left space-y-1.5 min-w-[150px]';
      popupContent.innerHTML = `
        <h4 class="font-serif font-bold text-sm text-parchment-900 m-0 leading-tight">${q.title}</h4>
        <div class="flex gap-1.5 items-center">
          <span class="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-white">${q.priority}</span>
          <span class="text-[8px] text-gray-500 flex items-center gap-0.5"><i class="map-pin-icon"></i> ${q.location}</span>
        </div>
      `;

      const viewBtn = document.createElement('button');
      viewBtn.className = 'w-full mt-2 py-1 bg-amber-500 text-white rounded text-[10px] font-serif uppercase font-bold tracking-wider cursor-pointer';
      viewBtn.innerText = 'View Details';
      viewBtn.onclick = () => {
        navigate(`/quests/${q.id}`);
      };

      popupContent.appendChild(viewBtn);
      marker.bindPopup(popupContent);
    });

    // Zoom map to fit markers
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 12 });
    }
  }, [geocodedQuests, statusFilter, navigate]);

  return (
    <div className="space-y-6 flex flex-col h-[75vh]">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-parchment-100 dark:bg-rpg-card p-4 rounded-lg border border-parchment-200 dark:border-rpg-border journal-paper shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Navigation className="text-amber-500 shrink-0" size={18} />
          <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-parchment-900 dark:text-white m-0">
            Adventure Map Tracker
          </h3>
          {isGeocoding && (
            <span className="text-[10px] text-amber-600 dark:text-rpg-gold font-serif animate-pulse">
              (Decrypting coordinates...)
            </span>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded p-0.5">
          {(['All', 'Pending', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded text-[10px] font-serif font-bold uppercase tracking-wider transition cursor-pointer ${
                statusFilter === tab
                  ? 'bg-amber-500 text-white dark:bg-rpg-gold dark:text-parchment-900 shadow-sm'
                  : 'text-parchment-650 dark:text-gray-400 hover:text-parchment-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Map Viewport Container */}
      {locationQuests.length === 0 ? (
        <div className="journal-paper p-12 rounded-lg border border-dashed border-parchment-300 dark:border-rpg-border text-center flex-1 flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm">
          <MapPin size={48} className="text-parchment-300 mb-4 animate-bounce" />
          <h3 className="font-serif font-bold text-lg text-parchment-900 dark:text-white uppercase tracking-wider mb-2">
            No Location Pin Quests
          </h3>
          <p className="text-xs text-parchment-700 dark:text-gray-400">
            None of your logged quests have geographic location pins. Create or edit a quest and add a location (e.g. "Tokyo, Japan") to plot it on this adventure map.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-[400px] relative rounded-lg border-2 border-parchment-300 dark:border-rpg-border overflow-hidden shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          
          {/* Map instructions popup overlay */}
          <div className="absolute bottom-3 left-3 z-10 bg-parchment-100/90 dark:bg-rpg-card/90 border border-parchment-300 dark:border-rpg-border p-2.5 rounded shadow-md text-left flex items-start gap-2 max-w-xs pointer-events-none text-[10px] font-sans">
            <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-serif font-bold block mb-0.5 uppercase tracking-wide">Map Key</span>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Pending
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Completed
              </div>
              <span className="text-parchment-500 block">Locations geocoded dynamically.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
