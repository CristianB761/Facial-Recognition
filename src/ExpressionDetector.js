import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

// Definimos las dimensiones del vídeo
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

// Traducciones de las expresiones
const expressionTranslations = {
    neutral: 'Neutral 😐',
    happy: 'Feliz 😊',
    sad: 'Triste 😞',
    angry: 'Enojado 😠',
    fearful: 'Asustado 😨',
    disgusted: 'Disgustado 🤢',
    surprised: 'Sorprendido 😮',
};

// Colores de fondo para cada expresión
const expressionColors = {
    neutral: '#2c2c2c',      // Gris oscuro
    happy: '#f6d654',        // Amarillo
    sad: '#4487d0',          // Azul
    angry: '#e9302a',        // Rojo
    fearful: '#9b74ca',      // Morado
    disgusted: '#83be5b',    // Verde
    surprised: '#f69340',    //Naranja 
};

const ExpressionDetector = () => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [detectedExpression, setDetectedExpression] = useState('Detectando...');
    const [backgroundColor, setBackgroundColor] = useState('#2c2c2c'); // Estado para el color de fondo

    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null); // Ref para guardar el ID del intervalo

    // PASO A: Cargar los modelos de IA
    useEffect(() => {
        const loadModels = async () => {
            // Los modelos están en la carpeta /public/models
            const MODEL_URL = '/models';

            console.log('Cargando modelos...');
            try {
                await Promise.all([
                    // Modelo ligero para detectar rostros rápidamente
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    // Modelo para detectar los 68 puntos faciales (ojos, nariz, boca)
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    // Modelo para reconocer la expresión
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                console.log('Modelos cargados correctamente.');
            } catch (error) {
                console.error('Error cargando los modelos:', error);
            }
        };
        loadModels();

        // Limpieza: detener el intervalo cuando el componente se desmonta
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // PASO B: Función para iniciar la detección
    const startDetection = () => {
        console.log('Iniciant detecció...');

        intervalRef.current = setInterval(async () => {
            if (webcamRef.current && 
                webcamRef.current.video && 
                canvasRef.current && 
                modelsLoaded) {

                // 1. Obtener el vídeo de la webcam
                const video = webcamRef.current.video;

                // 2. Crear un canvas a partir del vídeo (para dibujar sobre él)
                const canvas = canvasRef.current;
                const displaySize = { 
                    width: VIDEO_WIDTH, 
                    height: VIDEO_HEIGHT 
                };
                faceapi.matchDimensions(canvas, displaySize);

                // 3. Ejecutar la detección
                // .withFaceLandmarks() para los puntos
                // .withFaceExpressions() para las emociones
                const detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceExpressions();

                // 4. Procesar los resultados
                if (detections.length > 0) {
                    // Cogemos la primera cara detectada
                    const expressions = detections[0].expressions;

                    // Encontramos la expresión dominante (la que tiene mayor probabilidad)
                    const dominantExpression = Object.keys(expressions).reduce((a, b) => 
                        expressions[a] > expressions[b] ? a : b
                    );
                    
                    // Actualizamos el estado con la traducción
                    setDetectedExpression(
                        expressionTranslations[dominantExpression] || dominantExpression
                    );

                    // Cambiamos el color de fondo según la expresión detectada
                    setBackgroundColor(expressionColors[dominantExpression] || '#2c2c2c');

                    // 5. Dibujar las detecciones en el canvas (opcional, pero útil para RA2)
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height); // Limpiar canvas

                    // Dibuja el recuadro de la cara (opcional)
                    //faceapi.draw.drawDetections(canvas, resizedDetections);

                    // Dibuja las expresiones (texto y probabilidad)
                    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
                    
                    // Dibuja los puntos faciales
                    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

                } else {
                    setDetectedExpression('Sin rostro detectado');
                    // Volver al color por defecto cuando no hay rostro
                    setBackgroundColor('#2c2c2c');
                    // Limpiar el canvas si no hay detecciones
                    const context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }, 500); // Ejecuta la detección cada 500ms
    };

    // PASO C: Función que se activa cuando la cámara está lista
    const handleVideoOnPlay = () => {
        // Una vez que la cámara funciona, empezamos la detección
        startDetection();
    };

    // PASO D: Renderizar el componente
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: backgroundColor, transition: 'background-color 0.5s ease' }}>
            <h2>Detector de Estado de Ánimo</h2>
            {!modelsLoaded ? (
                <p>Cargando modelos de IA, por favor, espere...</p>
            ) : (
                <p>¡Modelos Cargados!</p>
            )}

            {/* Contenedor para superponer webcam y canvas */}
            <div style={{ 
                position: 'relative', 
                width: VIDEO_WIDTH, 
                height: VIDEO_HEIGHT 
            }}>
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    width={VIDEO_WIDTH}
                    height={VIDEO_HEIGHT}
                    videoConstraints={{ 
                        width: VIDEO_WIDTH, 
                        height: VIDEO_HEIGHT, 
                        facingMode: 'user' 
                    }}
                    onUserMedia={handleVideoOnPlay} // Activa la detección cuando la cámara se inicia
                    style={{ position: 'absolute', top: 0, left: 0 }}
                />
                <canvas
                    ref={canvasRef}
                    width={VIDEO_WIDTH}
                    height={VIDEO_HEIGHT}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                />
            </div>

            {modelsLoaded && (
                <h3 style={{ marginTop: '20px', fontSize: '1.5em' }}>
                    Estado de ánimo detectado: {detectedExpression}
                </h3>
            )}
        </div>
    );
};

export default ExpressionDetector;