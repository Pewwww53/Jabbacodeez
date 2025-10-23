import geopandas as gpd
import folium
import requests
from shapely.geometry import LineString, Point, box
from typing import List, Dict
from functools import lru_cache
import os
import concurrent.futures
import json
API_KEY = 'MzjnApJyjvSZP7hlZQjokm9ydo53iRyH'
OPENWEATHER_API_KEY = 'f2be87f26ec8100764a948281c246315'
FLOOD_LEVELS = {
    1: '#ffff00',
    2: '#ffa500',
    3: '#ff0000'
}
DEFAULT_COLOR = 'blue'
FLOOD_WEIGHTS = {1: 1, 2: 2, 3: 3}

@lru_cache(maxsize=128)
def get_route(start: str, end: str) -> Dict:
    """Get route data from TomTom API with caching."""
    url = f"https://api.tomtom.com/routing/1/calculateRoute/{start}:{end}/json"
    params = {
        'key': API_KEY,
        'traffic': 'true',
        'routeType': 'fastest',
        'travelMode': 'car',
        'alternativeType': 'anyRoute',
        'maxAlternatives': '2',
        'instructionsType': 'text', 
        'instructions': 'true'     
    }
    
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching route: {e}")
        return {}

def check_route_flooding(route_coordinates: List[List[float]], flood_data: gpd.GeoDataFrame) -> int:
    flood_severity = [0] * 3
    
    segments = [
        LineString([(p[1], p[0]) for p in route_coordinates[i:i+2]])
        for i in range(len(route_coordinates) - 1)
    ]
    
    for segment in segments:
        intersecting_areas = flood_data[flood_data.geometry.intersects(segment)]
        for var in intersecting_areas['Var']:
            if int(var) in [1, 2, 3]:
                flood_severity[int(var) - 1] += 1
    
    return sum(count *  FLOOD_WEIGHTS[i+1] for i, count in enumerate(flood_severity))

def check_route_flood_level(latitude: float, longitude: float, flood_data: gpd.GeoDataFrame) -> int:
    point = Point(longitude, latitude)
    intersecting_areas = flood_data[flood_data.geometry.contains(point)]
    for var in intersecting_areas['Var']:
        if int(var) in [1, 2, 3]:
            return int(var)
    return 0


@lru_cache(maxsize=1)
def load_flood_data():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    shapefile_path = os.path.join(BASE_DIR, 'map', 'MetroManila_Flood_5year.shp')
    return gpd.read_file(shapefile_path)

def check_route_flood_level_batch(coordinates: List[List[float]], flood_data: gpd.GeoDataFrame) -> List[int]:
    points = [Point(lon, lat) for lat, lon in coordinates]
    flood_levels = [0] * len(points)
    
    bounds = box(
        min(p.x for p in points),
        min(p.y for p in points),
        max(p.x for p in points),
        max(p.y for p in points)
    )
    
    relevant_flood_data = flood_data[flood_data.geometry.intersects(bounds)]
    
    for idx, point in enumerate(points):
        intersecting = relevant_flood_data[relevant_flood_data.geometry.contains(point)]
        for var in intersecting['Var']:
            if int(var) in [1, 2, 3]:
                flood_levels[idx] = int(var)
                break
    
    return flood_levels

def get_weather_data(latitude: float, longitude: float) -> Dict:
    """Fetch weather data from OpenWeatherMap API."""
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return {}

def assess_flood_risk(route_coordinates: List[List[float]], flood_data: gpd.GeoDataFrame) -> int:
    """Assess flood risk based on route coordinates and weather data."""
    total_flood_score = check_route_flooding(route_coordinates, flood_data)
    
    sampled_coords = route_coordinates[::5]

    def fetch_weather(coord):
        weather_data = get_weather_data(coord[0], coord[1])
        if weather_data and 'weather' in weather_data:
            for weather in weather_data['weather']:
                if weather['main'] in ['Rain', 'Thunderstorm']:
                    return 2
        return 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        weather_scores = list(executor.map(fetch_weather, sampled_coords))

    total_flood_score += sum(weather_scores)
    return total_flood_score

def get_waypoint_data(start: str, end: str) -> Dict:
    try:
        flood_data = load_flood_data()
    except Exception as e:
        print(f"Error loading flood data: {e}")
        return {}

    route_data = get_route(start, end)
    if not route_data or 'routes' not in route_data:
        print("No routes found")
        return {}

    routes = []
    best_score = float('inf')
    best_route_index = -1

    def process_route(route_info):
        route, idx = route_info

        route_coordinates = [[point['latitude'], point['longitude']] for point in route['legs'][0]['points']]
        # Extract instructions from TomTom response
        instructions = []
        if 'guidance' in route and route['guidance']:
            for instr in route['guidance'].get('instructions', []):
                instructions.append({
                    'message': instr.get('message', ''),
                    'point': instr.get('point', {}),
                    'street': instr.get('street', ''),
                    'travelTimeInSeconds': instr.get('travelTimeInSeconds', 0),
                    'routeOffsetInMeters': instr.get('routeOffsetInMeters', 0),
                    'maneuver': instr.get('maneuver', ''),
                })
        score = assess_flood_risk(route_coordinates, flood_data)
        
        distance_meters = route.get('summary', {}).get('lengthInMeters', 0)
        duration_seconds = route.get('summary', {}).get('travelTimeInSeconds', 0)

        segment_midpoints = []
        segment_flood_levels = []
        for i in range(len(route_coordinates) - 1):
            lat1, lon1 = route_coordinates[i]
            lat2, lon2 = route_coordinates[i + 1]
            mid_lat = (lat1 + lat2) / 2
            mid_lon = (lon1 + lon2) / 2
            flood_level = check_route_flood_level(mid_lat, mid_lon, flood_data)
            segment_midpoints.append((mid_lat, mid_lon))
            segment_flood_levels.append(flood_level)

        flood3_indices = [i for i, lvl in enumerate(segment_flood_levels) if lvl == 3]
        flood3_coords = [segment_midpoints[i] for i in flood3_indices]

        def fetch_weather(coord):
            weather_data = get_weather_data(coord[0], coord[1])
            if weather_data and 'weather' in weather_data:
                for weather in weather_data['weather']:
                    if weather['main'] in ['Rain', 'Thunderstorm']:
                        return True
            return False

        is_raining_results = []
        if flood3_coords:
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                is_raining_results = list(executor.map(fetch_weather, flood3_coords))

        for index, is_raining in zip(flood3_indices, is_raining_results):
            if not is_raining:
                segment_flood_levels[index] = 2
        route_info_dict = {
            'coordinates': route_coordinates,
            'score': score,
            'distance': distance_meters / 1000 if distance_meters else None,
            'duration': duration_seconds / 60 if duration_seconds else None,
            'flood_levels': segment_flood_levels,
            'instructions': instructions, 
        }
        
        return route_info_dict, score, idx

    with concurrent.futures.ThreadPoolExecutor() as executor:
        route_results = list(executor.map(
            process_route, 
            [(route, idx) for idx, route in enumerate(route_data['routes'])]
        ))

    for route_info, score, idx in route_results:
        routes.append(route_info)
        if score < best_score:
            best_score = score
            best_route_index = idx
            
    return {
        'routes': routes,
        'best_route_index': best_route_index
    }
