from rest_framework.views import APIView
from rest_framework.response import Response
from .generate_waypoint import get_waypoint_data  # Correct import

class GetWaypointView(APIView):
    def get(self, request):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        if not start or not end:
            return Response({'error': 'Missing start or end parameter'}, status=400)
        result = get_waypoint_data(start, end)  # Use the correct function
        return Response({'result': result})