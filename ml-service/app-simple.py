"""
AIAccounter v2.4.0 ML Service - Simplified Version
Without Prophet/ARIMA (requires C++ compiler)
Uses simple statistical forecasting for testing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def parse_data(data):
    """Parse and validate input data"""
    if not data or not isinstance(data, list):
        raise ValueError("Data must be a non-empty list")
    
    dates = []
    values = []
    
    for item in data:
        if 'date' not in item or 'amount' not in item:
            raise ValueError("Each item must have 'date' and 'amount'")
        dates.append(item['date'])
        values.append(float(item['amount']))
    
    return dates, values

def simple_forecast(values, periods=30):
    """Simple moving average + linear trend forecasting"""
    n = len(values)
    if n < 7:
        raise ValueError("Need at least 7 data points for forecasting")
    
    # Calculate moving average (last 7 days)
    window = min(7, n)
    recent_avg = sum(values[-window:]) / window
    
    # Calculate linear trend
    x = list(range(n))
    mean_x = sum(x) / n
    mean_y = sum(values) / n
    
    numerator = sum((x[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))
    
    slope = numerator / denominator if denominator != 0 else 0
    intercept = mean_y - slope * mean_x
    
    # Generate predictions
    predictions = []
    last_date = datetime.now()
    
    for i in range(periods):
        day_index = n + i
        predicted = intercept + (slope * day_index)
        
        # Add some variance for confidence intervals
        std_dev = (sum((values[i] - mean_y) ** 2 for i in range(n)) / n) ** 0.5
        lower_bound = predicted - (1.96 * std_dev)
        upper_bound = predicted + (1.96 * std_dev)
        
        pred_date = (last_date + timedelta(days=i+1)).strftime('%Y-%m-%d')
        
        predictions.append({
            'date': pred_date,
            'predicted': round(predicted, 2),
            'lower_bound': round(lower_bound, 2),
            'upper_bound': round(upper_bound, 2),
            'confidence': 0.95
        })
    
    return predictions

# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'AIAccounter ML Service (Simplified)',
        'version': '2.4.0-simple',
        'timestamp': datetime.now().isoformat(),
        'models_available': ['simple_forecast']
    })

@app.route('/forecast/simple', methods=['POST'])
def forecast_simple():
    """Simple statistical forecasting"""
    try:
        data = request.json
        
        if not data or 'data' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: data'
            }), 400
        
        periods = data.get('periods', 30)
        
        # Parse data
        dates, values = parse_data(data['data'])
        
        # Generate forecast
        predictions = simple_forecast(values, periods)
        
        # Calculate metrics
        mean_value = sum(values) / len(values)
        std_dev = (sum((v - mean_value) ** 2 for v in values) / len(values)) ** 0.5
        
        return jsonify({
            'success': True,
            'model': 'simple_forecast',
            'forecast': predictions,
            'metrics': {
                'input_points': len(values),
                'mean': round(mean_value, 2),
                'std_dev': round(std_dev, 2),
                'trend': 'upward' if predictions[-1]['predicted'] > values[-1] else 'downward'
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/forecast/prophet', methods=['POST'])
def forecast_prophet():
    """Prophet forecasting (mock for testing)"""
    return jsonify({
        'success': False,
        'error': 'Prophet requires Visual Studio Build Tools. Use /forecast/simple instead.',
        'install_guide': 'Install Visual Studio Build Tools or use Docker image'
    }), 501

@app.route('/forecast/arima', methods=['POST'])
def forecast_arima():
    """ARIMA forecasting (mock for testing)"""
    return jsonify({
        'success': False,
        'error': 'ARIMA requires Visual Studio Build Tools. Use /forecast/simple instead.',
        'install_guide': 'Install Visual Studio Build Tools or use Docker image'
    }), 501

@app.route('/forecast/auto', methods=['POST'])
def forecast_auto():
    """Auto model selection - defaults to simple forecast"""
    try:
        data = request.json
        
        if not data or 'data' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: data'
            }), 400
        
        periods = data.get('periods', 30)
        dates, values = parse_data(data['data'])
        predictions = simple_forecast(values, periods)
        
        return jsonify({
            'success': True,
            'model': 'simple_forecast',
            'selection_reason': 'Only available model in simplified version',
            'forecast': predictions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    print('╔════════════════════════════════════════════════╗')
    print('║   AIAccounter ML Service v2.4.0 (Simplified)  ║')
    print('╚════════════════════════════════════════════════╝')
    print('')
    print('🚀 Starting Flask server...')
    print('📊 Available endpoints:')
    print('   GET  /health')
    print('   POST /forecast/simple')
    print('   POST /forecast/auto')
    print('')
    print('⚠️  Note: Prophet/ARIMA disabled (requires C++ compiler)')
    print('💡 Use /forecast/simple for testing')
    print('')
    
    app.run(host='0.0.0.0', port=5000, debug=True)
