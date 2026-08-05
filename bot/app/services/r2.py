import uuid

import aioboto3
from botocore.client import Config as BotoConfig

from app.config import get_settings

settings = get_settings()


async def upload_bytes(data: bytes, key: str, content_type: str = "image/jpeg") -> str:
    if not settings.R2_PUBLIC_BASE_URL:
        raise ValueError("R2_PUBLIC_BASE_URL sozlanmagan.")

    session = aioboto3.Session()

    async with session.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
        config=BotoConfig(
            s3={"addressing_style": "path"},
            signature_version="s3v4",
        ),
    ) as client:
        await client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"


async def upload_screenshot(
    telegram_id: int,
    data: bytes,
    content_type: str = "image/jpeg",
) -> str:
    extension = "jpg" if "jpeg" in content_type else "png"
    key = f"{settings.R2_UPLOAD_PREFIX}/premium/{telegram_id}/{uuid.uuid4()}.{extension}"
    key = key.strip("/")

    return await upload_bytes(data, key, content_type)
