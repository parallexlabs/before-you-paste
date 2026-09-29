const TRANSFORMERS_VERSION = '4.3.0';
const MODEL_ID = 'Xenova/distilbert-base-multilingual-cased-ner-hrl';
const MODEL_REVISION = 'c2a4dbf593c57f47004c5bc2d3770d311aee9c43';
const MAX_NER_CHARS = 50_000;

let pipeline = null;
let loadGeneration = 0;
let activeLoadId = 0;

self.addEventListener('message', async (event) => {
  const { type, text, id } = event.data;

  if (type === 'cancel') {
    loadGeneration += 1;
    pipeline = null;
    self.postMessage({ type: 'cancelled', id: activeLoadId });
    return;
  }

  if (type === 'load') {
    const myGeneration = ++loadGeneration;
    activeLoadId = id;
    pipeline = null;
    try {
      const { pipeline: createPipeline, env } = await import(
        `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}`
      );
      if (myGeneration !== loadGeneration) {
        self.postMessage({ type: 'cancelled', id });
        return;
      }
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = false;
      }

      self.postMessage({ type: 'progress', id, percent: 5 });

      const loaded = await createPipeline('token-classification', MODEL_ID, {
        quantized: true,
        revision: MODEL_REVISION,
        progress_callback: (progress) => {
          if (myGeneration !== loadGeneration) return;
          if (progress.status === 'progress' && progress.progress) {
            self.postMessage({ type: 'progress', id, percent: Math.round(progress.progress) });
          }
        }
      });

      if (myGeneration !== loadGeneration) {
        self.postMessage({ type: 'cancelled', id });
        return;
      }

      pipeline = loaded;
      self.postMessage({ type: 'ready', id, model: MODEL_ID });
    } catch (err) {
      if (myGeneration === loadGeneration) {
        self.postMessage({ type: 'error', id, message: err.message || 'Model load failed' });
      }
    }
    return;
  }

  if (type === 'predict' && pipeline && text) {
    if (text.length > MAX_NER_CHARS) {
      self.postMessage({ type: 'error', id, message: 'Text exceeds maximum length for name recognition' });
      return;
    }
    try {
      const output = await pipeline(text, { aggregation_strategy: 'none' });
      self.postMessage({
        type: 'result',
        id,
        entities: output.map((o) => ({
          entity: o.entity_group || o.entity,
          word: o.word,
          start: o.start,
          end: o.end,
          score: o.score
        }))
      });
    } catch (err) {
      self.postMessage({ type: 'error', id, message: err.message || 'Prediction failed' });
    }
  }
});
