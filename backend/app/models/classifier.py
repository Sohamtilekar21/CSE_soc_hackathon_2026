"""
Placeholder for your image classification model.

Nothing real is loaded here yet - `run_inference` just returns a fake
result so the rest of the stack (auth, storage, DB, frontend) can be
wired up and tested end to end before you plug in an actual model.

When you're ready, replace this with something like:

    import torch
    from torchvision import models, transforms
    from PIL import Image
    import io

    _model = models.resnet50(weights="IMAGENET1K_V2")
    _model.eval()

    _preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                              std=[0.229, 0.224, 0.225]),
    ])

    def run_inference(image_bytes: bytes) -> tuple[str, float]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = _preprocess(image).unsqueeze(0)
        with torch.no_grad():
            outputs = _model(tensor)
            probs = torch.softmax(outputs, dim=1)
            conf, idx = torch.max(probs, dim=1)
        return IMAGENET_CLASSES[idx.item()], conf.item()

Or load a fine-tuned checkpoint / ONNX model / call a hosted inference
endpoint instead - `run_inference` is the only function the rest of the
app depends on, so anything can go behind it.
"""


def run_inference(image_bytes: bytes) -> tuple[str, float]:
    """
    Placeholder inference function.

    Args:
        image_bytes: raw bytes of the uploaded image.

    Returns:
        (label, confidence) tuple.
    """
    return "placeholder-label", 0.0
