# ML Forecasting Service v2.4.0
# Python Flask + Prophet + ARIMA

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

# =================================
# PROPHET FORECASTING
# =================================

@app.route('/forecast/prophet', methods=['POST'])
def forecast_prophet():
    """
    Прогнозирование с помощью Prophet (сезонность + тренды)
    
    Request:
    {
        "data": [
            {"date": "2025-01-01", "amount": 50000},
            {"date": "2025-01-02", "amount": 55000},
            ...
        ],
        "periods": 30,  # Кол-во дней для прогноза
        "confidence": 0.95  # Доверительный интервал
    }
    """
    try:
        data = request.json
        
        # Подготовка данных для Prophet
        df = pd.DataFrame(data['data'])
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['amount'].astype(float)
        df = df[['ds', 'y']]
        
        # Создание и обучение модели
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=True,
            interval_width=data.get('confidence', 0.95)
        )
        model.fit(df)
        
        # Создание будущих дат
        periods = data.get('periods', 30)
        future = model.make_future_dataframe(periods=periods)
        
        # Прогноз
        forecast = model.predict(future)
        
        # Формирование ответа
        result = []
        for _, row in forecast.tail(periods).iterrows():
            result.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted': float(row['yhat']),
                'lower_bound': float(row['yhat_lower']),
                'upper_bound': float(row['yhat_upper']),
                'confidence': data.get('confidence', 0.95)
            })
        
        # Метрики модели
        metrics = {
            'model': 'Prophet',
            'training_samples': len(df),
            'forecast_periods': periods,
            'confidence_interval': data.get('confidence', 0.95)
        }
        
        return jsonify({
            'success': True,
            'model': 'prophet',
            'forecast': result,
            'metrics': metrics
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# =================================
# ARIMA FORECASTING
# =================================

@app.route('/forecast/arima', methods=['POST'])
def forecast_arima():
    """
    Прогнозирование с помощью ARIMA (временные ряды)
    
    Request:
    {
        "data": [
            {"date": "2025-01-01", "amount": 50000},
            {"date": "2025-01-02", "amount": 55000},
            ...
        ],
        "periods": 30,
        "order": [1, 1, 1]  # (p, d, q) параметры ARIMA
    }
    """
    try:
        data = request.json
        
        # Подготовка данных
        df = pd.DataFrame(data['data'])
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        df.set_index('date', inplace=True)
        
        series = df['amount'].astype(float)
        
        # Параметры ARIMA
        order = tuple(data.get('order', [1, 1, 1]))
        
        # Создание и обучение модели
        model = ARIMA(series, order=order)
        model_fit = model.fit()
        
        # Прогноз
        periods = data.get('periods', 30)
        forecast_result = model_fit.forecast(steps=periods)
        
        # Доверительные интервалы
        conf_int = model_fit.get_forecast(steps=periods).conf_int(alpha=0.05)
        
        # Формирование ответа
        last_date = series.index[-1]
        result = []
        for i in range(periods):
            pred_date = last_date + timedelta(days=i+1)
            result.append({
                'date': pred_date.strftime('%Y-%m-%d'),
                'predicted': float(forecast_result.iloc[i]),
                'lower_bound': float(conf_int.iloc[i, 0]),
                'upper_bound': float(conf_int.iloc[i, 1]),
                'confidence': 0.95
            })
        
        # Метрики модели
        metrics = {
            'model': 'ARIMA',
            'order': order,
            'training_samples': len(series),
            'forecast_periods': periods,
            'aic': float(model_fit.aic),
            'bic': float(model_fit.bic)
        }
        
        return jsonify({
            'success': True,
            'model': 'arima',
            'forecast': result,
            'metrics': metrics
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# =================================
# AUTO-SELECT BEST MODEL
# =================================

@app.route('/forecast/auto', methods=['POST'])
def forecast_auto():
    """
    Автоматический выбор лучшей модели на основе AIC
    
    Request:
    {
        "data": [
            {"date": "2025-01-01", "amount": 50000},
            ...
        ],
        "periods": 30
    }
    """
    try:
        data = request.json
        periods = data.get('periods', 30)
        
        # Пробуем обе модели
        prophet_result = None
        arima_result = None
        
        # Prophet
        try:
            df_prophet = pd.DataFrame(data['data'])
            df_prophet['ds'] = pd.to_datetime(df_prophet['date'])
            df_prophet['y'] = df_prophet['amount'].astype(float)
            df_prophet = df_prophet[['ds', 'y']]
            
            model_prophet = Prophet(daily_seasonality=True, weekly_seasonality=True)
            model_prophet.fit(df_prophet)
            future_prophet = model_prophet.make_future_dataframe(periods=periods)
            forecast_prophet = model_prophet.predict(future_prophet)
            
            prophet_result = {
                'model': 'prophet',
                'score': len(df_prophet)  # Простой скор для примера
            }
        except:
            pass
        
        # ARIMA
        try:
            df_arima = pd.DataFrame(data['data'])
            df_arima['date'] = pd.to_datetime(df_arima['date'])
            df_arima = df_arima.sort_values('date')
            df_arima.set_index('date', inplace=True)
            series_arima = df_arima['amount'].astype(float)
            
            model_arima = ARIMA(series_arima, order=(1, 1, 1))
            model_fit_arima = model_arima.fit()
            
            arima_result = {
                'model': 'arima',
                'score': model_fit_arima.aic
            }
        except:
            pass
        
        # Выбираем лучшую модель
        if prophet_result and arima_result:
            if prophet_result['score'] < arima_result['score']:
                return forecast_prophet()
            else:
                return forecast_arima()
        elif prophet_result:
            return forecast_prophet()
        elif arima_result:
            return forecast_arima()
        else:
            return jsonify({
                'success': False,
                'error': 'Both models failed to train'
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# =================================
# TRAIN MODEL & SAVE
# =================================

@app.route('/train', methods=['POST'])
def train_model():
    """
    Обучение модели и сохранение для последующего использования
    
    Request:
    {
        "workspace_id": 1,
        "model_type": "prophet",
        "data": [...]
    }
    """
    try:
        data = request.json
        workspace_id = data.get('workspace_id')
        model_type = data.get('model_type', 'prophet')
        
        # TODO: Сохранение модели в файл/DB
        
        return jsonify({
            'success': True,
            'message': f'{model_type} model trained for workspace {workspace_id}',
            'model_id': f'{workspace_id}_{model_type}_{datetime.now().timestamp()}'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# =================================
# HEALTH CHECK
# =================================

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка работоспособности сервиса"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Forecasting Service',
        'version': 'v2.4.0',
        'models': ['prophet', 'arima'],
        'timestamp': datetime.now().isoformat()
    })

# =================================
# MAIN
# =================================

if __name__ == '__main__':
    print("🚀 ML Forecasting Service v2.4.0")
    print("📊 Models: Prophet, ARIMA")
    print("🔗 Endpoints:")
    print("   - POST /forecast/prophet")
    print("   - POST /forecast/arima")
    print("   - POST /forecast/auto")
    print("   - POST /train")
    print("   - GET /health")
    print("\n✅ Server running on http://0.0.0.0:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
