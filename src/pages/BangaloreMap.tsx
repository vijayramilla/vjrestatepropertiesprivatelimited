import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Circle, GoogleMap, OverlayView, Polyline } from '@react-google-maps/api';
import { AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { soundEngine } from '@/utils/soundEngine';
import { fetchNearbyPlaces, type NearbyPlace } from '@/utils/fetchNearbyPlaces';
import { generateAIAnalysis } from '@/utils/aiAnalyze';
import { collection, onSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setDefaultSiteMeta } from '@/lib/siteMeta';
import { BANGALORE_COORDINATES, resolveMapLocalityName } from '@/data/bangaloreCoordinates';
import {
  BUDGET_FILTERS,
  CATEGORY_CONFIG,
  formatMapINR,
  LAND_TYPES,
  type BudgetFilter,
  type LandType,
} from '@/data/mapConfig';
import MapTopBar from '@/components/map/MapTopBar';
import MapFilterPanel from '@/components/map/MapFilterPanel';
import MapPropertySidebar from '@/components/map/MapPropertySidebar';
import MapPropertyPopup from '@/components/map/MapPropertyPopup';
import {
  DEFAULT_MAP_SEARCH,
  matchesMapBudget,
  matchesMapCategory,
  matchesMapSearch,
  parseMapPrice,
  type MapSearchFilter,
} from '@/lib/mapFilters';

const MAP_CENTER = { lat: 12.9716, lng: 77.5946 };
const DEFAULT_ZOOM = 11;
const SELECTED_ZOOM = 15;

const TYPE_ALIASES: Record<string, LandType> = {
  'Residential Plot': 'Residential Plot',
  'Commercial Plot': 'Commercial Plot',
  'Agriculture Land': 'Agriculture Land',
  'PG Plot': 'PG Plot',
};

interface MapProperty {
  id: string;
  locality: string;
  propertyType: LandType;
  price: number;
  pricePerSqft: number;
  title: string;
  image: string | null;
  images: string[];
  areaSqft: number;
  areaAcres: number;
  areaGuntas: number;
  areaUnit: string;
  dimensions: string;
  khata: string;
  facing: string;
  dcConversion?: string;
  color: string;
  lat: number;
  lng: number;
}

function normalizePropertyType(rawType?: string, plotSubtype?: string): LandType | null {
  if (plotSubtype === 'PG Plot') return 'PG Plot';
  if (plotSubtype === 'Agriculture Land') return 'Agriculture Land';
  if (plotSubtype === 'Commercial Plot') return 'Commercial Plot';
  if (plotSubtype === 'Residential Plot') return 'Residential Plot';
  const fromRaw = TYPE_ALIASES[rawType ?? ''] ?? (rawType as LandType | undefined);
  if (fromRaw && LAND_TYPES.includes(fromRaw)) return fromRaw;
  return null;
}

function jitterFromId(id: string, salt: string): number {
  let hash = 0;
  const key = `${id}-${salt}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 10000;
  }
  return ((hash % 1000) / 1000 - 0.5) * 0.002;
}

function mapFirestoreDoc(docSnap: QueryDocumentSnapshot): MapProperty | null {
  const raw = docSnap.data() as Record<string, unknown>;

  const propertyType = normalizePropertyType(
    String(raw.propertyType ?? raw.type ?? raw.category ?? ''),
    String(raw.plot_subtype ?? raw.plotSubtype ?? ''),
  );

  if (!propertyType) return null;

  const storedLat = Number(raw.map_lat ?? raw.mapLat ?? 0);
  const storedLng = Number(raw.map_lng ?? raw.mapLng ?? 0);
  const hasStoredPin =
    Number.isFinite(storedLat) &&
    Number.isFinite(storedLng) &&
    storedLat !== 0 &&
    storedLng !== 0;

  const rawLocality = String(
    raw.locality ?? raw.area ?? raw.location ?? raw.area_locality ?? '',
  ).trim();

  const canonicalLocality = resolveMapLocalityName(rawLocality);
  let locality: string;
  let lat: number;
  let lng: number;

  if (hasStoredPin) {
    lat = storedLat;
    lng = storedLng;
    locality = canonicalLocality ?? rawLocality;
    if (!locality) return null;
  } else if (canonicalLocality && BANGALORE_COORDINATES[canonicalLocality]) {
    locality = canonicalLocality;
    lat = BANGALORE_COORDINATES[locality].lat + jitterFromId(docSnap.id, 'lat');
    lng = BANGALORE_COORDINATES[locality].lng + jitterFromId(docSnap.id, 'lng');
  } else {
    return null;
  }

  const price = parseMapPrice(raw);
  const images = raw.images as string[] | undefined;
  const dcRaw = raw.extra_details as Record<string, string> | undefined;
  const areaUnit = String(raw.area_unit ?? raw.areaUnit ?? 'sqft');

  return {
    id: docSnap.id,
    locality,
    propertyType,
    price,
    pricePerSqft: Number(raw.price_per_sqft ?? raw.pricePerSqft ?? 0),
    title: String(raw.title ?? raw.name ?? raw.propertyName ?? ''),
    image: images?.[0] ?? (raw.image as string) ?? (raw.photoURL as string) ?? null,
    images: images ?? ((raw.image as string) ? [raw.image as string] : []),
    areaSqft: Number(raw.areaSqft ?? raw.area_sqft ?? raw.builtUpArea ?? raw.built_up_area_sqft ?? 0),
    areaAcres: Number(raw.areaAcres ?? raw.area_acres ?? 0),
    areaGuntas: Number(raw.areaGuntas ?? raw.area_guntas ?? 0),
    areaUnit,
    dimensions: String(raw.dimensions ?? '—'),
    khata: String(raw.khata ?? raw.khataType ?? raw.khata_type ?? '—'),
    facing: String(raw.facing ?? '—'),
    dcConversion: dcRaw?.['DC Conversion Done'] ?? undefined,
    color: CATEGORY_CONFIG[propertyType].color,
    lat,
    lng,
  };
}

function formatAreaLabel(p: MapProperty): string {
  if (p.areaUnit === 'acres' || p.propertyType === 'Agriculture Land') {
    const acres = p.areaAcres + p.areaGuntas / 40;
    return acres > 0 ? `${acres.toFixed(2)} Acres` : '—';
  }
  return p.areaSqft ? `${p.areaSqft.toLocaleString('en-IN')} sq.ft` : '—';
}

interface BangaloreMapProps {
  isLoaded: boolean;
  noHeaderOffset?: boolean;
}

export default function BangaloreMap({ isLoaded, noHeaderOffset }: BangaloreMapProps) {
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [, setLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeBudget, setActiveBudget] = useState<BudgetFilter>(BUDGET_FILTERS[0]);
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState<MapSearchFilter>(DEFAULT_MAP_SEARCH);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzeTarget, setAnalyzeTarget] = useState<MapProperty | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeCategories, setActiveCategories] = useState<string[]>([...LAND_TYPES]);

  useEffect(() => {
    document.title = 'VJR Land Map | Plots & Land in Bangalore';
    return () => {
      setDefaultSiteMeta();
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'properties'),
      (snapshot) => {
        const data = snapshot.docs
          .map(mapFirestoreDoc)
          .filter((item): item is MapProperty => item !== null);
        setProperties(data);
        setLoading(false);
      },
      (error) => {
        console.error('Map fetch error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredProperties = useMemo(
    () =>
      properties.filter((p) => {
        const matchesCategory = matchesMapCategory(p.propertyType, activeCategories);
        const matchesBudget = matchesMapBudget(p.price, activeBudget);
        const matchesSearch = matchesMapSearch(p, mapSearch);
        return matchesCategory && matchesBudget && matchesSearch;
      }),
    [properties, activeCategories, activeBudget, mapSearch],
  );

  useEffect(() => {
    if (
      selectedProperty &&
      !filteredProperties.some((p) => p.id === selectedProperty.id)
    ) {
      setSelectedProperty(null);
    }
  }, [filteredProperties, selectedProperty]);

  const handleMarkerClick = useCallback((property: MapProperty) => {
    setSelectedProperty(property);
  }, []);

  const sidebarItems = useMemo(
    () =>
      filteredProperties.map((p) => ({
        id: p.id,
        locality: p.locality,
        propertyType: p.propertyType,
        price: p.price,
        pricePerSqft: p.pricePerSqft,
        title: p.title,
        image: p.image,
        areaLabel: formatAreaLabel(p),
        color: p.color,
        priceLabel: formatMapINR(p.price),
      })),
    [filteredProperties],
  );

  const handleClosePopup = useCallback(() => {
    setSelectedProperty(null);
    setShowAnalysis(false);
    setAnalysisResult(null);
    setNearbyPlaces([]);
    setAnalyzeTarget(null);
  }, []);

  const handleMapClick = useCallback(() => {
    handleClosePopup();
  }, [handleClosePopup]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || isLocating) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(SELECTED_ZOOM);
        setIsLocating(false);
      },
      (err) => {
        console.log('Location denied:', err);
        setIsLocating(false);
      },
    );
  };

  const toggleCategory = (type: string) => {
    setActiveCategories((prev) =>
      prev.includes(type) ? prev.filter((c) => c !== type) : [...prev, type],
    );
  };

  const clearAllFilters = () => {
    setActiveCategories([...LAND_TYPES]);
    setActiveBudget(BUDGET_FILTERS[0]);
    setMapSearch(DEFAULT_MAP_SEARCH);
  };

  const handleAIAnalyze = async (property: MapProperty) => {
    if (!property || isAnalyzing) return;

    soundEngine.playPremiumActivate();

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setNearbyPlaces([]);
    setShowAnalysis(false);
    setAnalyzeTarget(property);

    let tickCount = 0;
    tickIntervalRef.current = setInterval(() => {
      soundEngine.playTick();
      tickCount++;
      if (tickCount > 20) {
        clearInterval(tickIntervalRef.current!);
      }
    }, 300);

    try {
      const places = await fetchNearbyPlaces(property.lat, property.lng, 2000);

      places.forEach((_, i) => {
        setTimeout(() => {
          soundEngine.playPing(0);
        }, i * 80);
      });

      setNearbyPlaces(places);

      const analysis = await generateAIAnalysis(property, places);
      setAnalysisResult(analysis);

      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);

      soundEngine.playSuccess();
      setShowAnalysis(true);
      setIsAnalyzing(false);
    } catch (err) {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setIsAnalyzing(false);
      console.error('AI Analyze error:', err);
    }
  };

  const handleMapLoad = useCallback((loadedMap: google.maps.Map) => {
    mapRef.current = loadedMap;
    loadedMap.setCenter(MAP_CENTER);
    loadedMap.setZoom(DEFAULT_ZOOM);
  }, []);

  useEffect(() => {
    if (!isLoaded || !searchInputRef.current) return;
    if (typeof google === 'undefined' || !google.maps.places) {
      console.warn('[Map] google.maps.places not available');
      return;
    }
    const input = searchInputRef.current;
    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'in' },
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(12.8, 77.4),
        new google.maps.LatLng(13.2, 77.8),
      ),
    });
    autocomplete.setFields(['geometry', 'name', 'formatted_address', 'place_id']);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        mapRef.current?.panTo(place.geometry.location);
        mapRef.current?.setZoom(15);
      }
      setSearchText(place.name || '');
    });
  }, [isLoaded]);

  const mapOptions = useMemo(
    (): google.maps.MapOptions => ({
      center: MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeId: 'hybrid',
      minZoom: 3,
      maxZoom: 20,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false,
    }),
    [],
  );

  const markerElements = useMemo(
    () =>
      filteredProperties.map((p) => {
            const isSelected = selectedProperty?.id === p.id;
            const isHovered = hoveredProperty === p.id;
            const dotSize = isSelected ? 16 : 13;
            return (
              <OverlayView
                key={p.id}
                position={{ lat: p.lat, lng: p.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  style={{
                    position: 'relative',
                    transform: 'translate(-50%, -50%)',
                    width: dotSize + 20,
                    height: dotSize + 20,
                  }}
                >
                    <div
                    role="button"
                    tabIndex={0}
                    className={`map-marker-core${isSelected ? ' is-selected' : ''}`}
                    onMouseEnter={() => setHoveredProperty(p.id)}
                    onMouseLeave={() => setHoveredProperty(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkerClick(p);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleMarkerClick(p);
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: dotSize,
                      height: dotSize,
                      marginTop: -dotSize / 2,
                      marginLeft: -dotSize / 2,
                      backgroundColor: isSelected ? '#000' : p.color,
                      border: `2.5px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.95)'}`,
                      boxShadow: isHovered || isSelected
                        ? `0 0 0 3px ${p.color}55, 0 2px 6px rgba(0,0,0,0.3)`
                        : `0 0 0 2px ${p.color}44, 0 1px 3px rgba(0,0,0,0.25)`,
                    }}
                  />

                  {isHovered && !isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translate(-50%, calc(-100% - 10px))',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        whiteSpace: 'nowrap',
                        zIndex: 100,
                        minWidth: '140px',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          height: '3px',
                          backgroundColor: p.color,
                          borderRadius: '2px',
                          marginBottom: '6px',
                        }}
                      />
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#111',
                          marginBottom: '3px',
                        }}
                      >
                        {formatMapINR(p.price)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{formatAreaLabel(p)}</div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: p.color,
                          fontWeight: 600,
                          marginTop: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {p.propertyType}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid white',
                          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
                        }}
                      />
                    </div>
                  )}
                </div>
              </OverlayView>
            );
          }),
    [filteredProperties, selectedProperty, hoveredProperty, handleMarkerClick],
  );

  if (!isLoaded) {
    return null;
  }

  if (typeof google === 'undefined' || !google.maps) {
    console.error('[Maps] google.maps not initialized despite isLoaded=true');
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <p className="text-sm text-gray-400">Map failed to initialize. Check console for details.</p>
      </div>
    );
  }

  return (
    <div className={`fixed inset-x-0 z-10 bg-gray-900 ${noHeaderOffset ? 'top-0 h-dvh' : 'top-14 md:top-16 h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]'}`} style={{ overscrollBehavior: 'none' }}>
      <MapFilterPanel
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        onSelectAllCategories={() => setActiveCategories([...LAND_TYPES])}
        onDeselectAllCategories={() => setActiveCategories([])}
        activeBudget={activeBudget}
        onSelectBudget={setActiveBudget}
        onClearAll={clearAllFilters}
        resultCount={filteredProperties.length}
      />

      <div className="relative h-full w-full">
        <div className="pointer-events-none absolute top-4 z-[110] flex flex-col items-start gap-2 overflow-visible transition-[left] duration-300"
          style={{ left: isSidebarOpen ? 'calc(min(100vw,380px) + 1rem)' : '1rem', right: '1rem' }}>
            <div className="pointer-events-auto flex w-full items-center gap-2 overflow-visible">
              <div className="relative flex-1 min-w-0 max-w-[280px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Location..."
                  autoComplete="off"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 rounded-full border-none outline-none text-xs font-medium text-gray-800 bg-white shadow-md"
                />
              </div>

            <MapTopBar
              onLocateMe={handleLocateMe}
              onOpenFilters={() => setIsFilterOpen(true)}
              activeBudget={activeBudget}
              activeCategories={activeCategories}
              isLocating={isLocating}
            />
          </div>

          <div className="pointer-events-auto relative z-[40] flex max-w-full items-center gap-2 overflow-x-auto pb-1">
            {LAND_TYPES.map((type) => {
              const isActive = activeCategories.includes(type);
              const config = CATEGORY_CONFIG[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleCategory(type)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold whitespace-nowrap shadow-md transition-all duration-200"
                  style={
                    isActive
                      ? {
                          backgroundColor: config.color,
                          color: '#fff',
                          boxShadow: `0 4px 12px ${config.color}66`,
                        }
                      : {
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          color: '#6b7280',
                          border: '1px solid rgba(0,0,0,0.1)',
                        }
                  }
                >
                  {config.label}
                  {isActive && <span className="ml-1 opacity-70">×</span>}
                </button>
              );
            })}
          </div>
        </div>

        <MapPropertySidebar
          open={isSidebarOpen}
          onOpen={() => setIsSidebarOpen(true)}
          onClose={() => setIsSidebarOpen(false)}
          properties={sidebarItems}
        />

        <div className="absolute inset-0 min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)]">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        options={mapOptions}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
      >
        {markerElements}

        {userLocation && (
          <OverlayView position={userLocation} mapPaneName={OverlayView.OVERLAY_LAYER}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#4285F4',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(66,133,244,0.5)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </OverlayView>
        )}

        {showAnalysis && analyzeTarget && (
          <>
            <Circle
              center={{ lat: analyzeTarget.lat, lng: analyzeTarget.lng }}
              radius={2000}
              options={{
                fillColor: '#3B82F6',
                fillOpacity: 0.06,
                strokeColor: '#60A5FA',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
            <Circle
              center={{ lat: analyzeTarget.lat, lng: analyzeTarget.lng }}
              radius={1000}
              options={{
                fillColor: '#3B82F6',
                fillOpacity: 0.04,
                strokeColor: '#93C5FD',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                strokeDashArray: '8 4',
              } as any}
            />
            {nearbyPlaces.slice(0, 8).map((place, i) => (
              <Polyline
                key={`line-${i}`}
                path={[
                  { lat: analyzeTarget.lat, lng: analyzeTarget.lng },
                  { lat: place.lat, lng: place.lng },
                ]}
                options={{
                  strokeColor: place.color,
                  strokeOpacity: 0.35,
                  strokeWeight: 1.5,
                  geodesic: true,
                }}
              />
            ))}
            {nearbyPlaces.map((place, i) => (
              <OverlayView
                key={`nearby-${i}`}
                position={{ lat: place.lat, lng: place.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  style={{
                    transform: 'translate(-50%, -50%)',
                    animation: `fadeInScale 0.3s ease ${i * 0.08}s both`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: place.color,
                      border: '2px solid white',
                      boxShadow: `0 0 12px ${place.color}88, 0 2px 8px rgba(0,0,0,0.3)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      cursor: 'default',
                    }}
                  >
                    {place.icon}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      backgroundColor: 'rgba(0,0,0,0.75)',
                      color: 'white',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {place.distance < 1000
                      ? `${place.distance}m`
                      : `${(place.distance / 1000).toFixed(1)}km`}
                  </div>
                </div>
              </OverlayView>
            ))}
          </>
        )}
      </GoogleMap>
        </div>
      </div>

      <AnimatePresence>
        {selectedProperty && (
          <MapPropertyPopup
            property={{
              id: selectedProperty.id,
              title: selectedProperty.title,
              locality: selectedProperty.locality,
              propertyType: selectedProperty.propertyType,
              price: selectedProperty.price,
              pricePerSqft: selectedProperty.pricePerSqft,
              image: selectedProperty.image,
              images: selectedProperty.images,
              areaLabel: formatAreaLabel(selectedProperty),
              dimensions: selectedProperty.dimensions,
              khata: selectedProperty.khata,
              facing: selectedProperty.facing,
              dcConversion: selectedProperty.dcConversion,
              color: selectedProperty.color,
              lat: selectedProperty.lat,
              lng: selectedProperty.lng,
            }}
            onClose={handleClosePopup}
            sidebarOpen={isSidebarOpen}
            onAIAnalyze={() => handleAIAnalyze(selectedProperty)}
            isAnalyzing={isAnalyzing}
            analysisResult={analysisResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
