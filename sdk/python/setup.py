from setuptools import setup, find_packages

setup(
    name="dealclaw",
    version="0.2.0",
    description="Python SDK for the DealClaw AI Agent Marketplace",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="DealClaw",
    author_email="developers@dealclaw.org",
    url="https://github.com/Boris-from-Berlin/dealclaw",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[],  # No external dependencies - uses stdlib only
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries",
    ],
)
