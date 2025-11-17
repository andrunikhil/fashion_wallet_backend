# ML Avatar Service

This is a stub implementation of the ML service for avatar processing. It provides mock endpoints for:

- Background removal
- Pose detection
- Measurement extraction
- Body type classification

## Running Locally

```bash
pip install -r requirements.txt
python app.py
```

The service will start on `http://localhost:5000`

## Running with Docker

```bash
docker build -t ml-avatar-service .
docker run -p 5000:5000 ml-avatar-service
```

## Endpoints

### Health Check
- **GET** `/health`
- Returns service health status

### Background Removal
- **POST** `/background-removal`
- Body: `{ "photos": [{ "url": "...", "type": "front|side|back" }] }`
- Returns processed photos with backgrounds removed

### Pose Detection
- **POST** `/pose-detection`
- Body: `{ "photos": [...] }`
- Returns 33 body landmarks with confidence scores

### Measurement Extraction
- **POST** `/measurement-extraction`
- Body: `{ "landmarks": {...}, "photoMetadata": {...}, "unit": "metric|imperial" }`
- Returns body measurements

### Body Type Classification
- **POST** `/body-type-classification`
- Body: `{ "measurements": {...} }`
- Returns body type classification (rectangle, triangle, hourglass, etc.)

## TODO: Production Implementation

1. **Background Removal**: Integrate SAM (Segment Anything Model) or U2-Net
2. **Pose Detection**: Integrate MediaPipe Pose or OpenPose
3. **Measurement Extraction**: Implement measurement calculation from landmarks
4. **Body Type Classification**: Train or integrate ML model for classification

## Environment Variables

- `FLASK_ENV`: Set to `production` for production deployment
- `LOG_LEVEL`: Logging level (default: INFO)
