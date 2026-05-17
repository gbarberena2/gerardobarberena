"""Generate a clean PDF version of the CV with only the phone number as personal contact.

Run from inside the `gerardobarberena` conda env:
    python generate_cv_pdf.py
"""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

OUT = Path(__file__).parent / "assets" / "cv_gerardo_barberena.pdf"
OUT.parent.mkdir(exist_ok=True)

PRIMARY = HexColor("#0B1220")
ACCENT = HexColor("#2563EB")
MUTED = HexColor("#475569")

styles = getSampleStyleSheet()

H_NAME = ParagraphStyle(
    "name", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=22, leading=26, textColor=PRIMARY, spaceAfter=2, alignment=TA_LEFT,
)
H_CONTACT = ParagraphStyle(
    "contact", parent=styles["Normal"], fontName="Helvetica",
    fontSize=10, leading=14, textColor=MUTED, spaceAfter=10,
)
H_SECTION = ParagraphStyle(
    "section", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12, leading=16, textColor=ACCENT, spaceBefore=12, spaceAfter=4,
)
H_ROLE = ParagraphStyle(
    "role", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=11, leading=14, textColor=PRIMARY, spaceAfter=1,
)
H_META = ParagraphStyle(
    "meta", parent=styles["Normal"], fontName="Helvetica-Oblique",
    fontSize=9.5, leading=12, textColor=MUTED, spaceAfter=4,
)
H_BODY = ParagraphStyle(
    "body", parent=styles["Normal"], fontName="Helvetica",
    fontSize=10, leading=14, textColor=PRIMARY,
)
H_BULLET = ParagraphStyle(
    "bullet", parent=H_BODY, leftIndent=12, bulletIndent=2, spaceAfter=2,
)
H_SUMMARY = ParagraphStyle(
    "summary", parent=H_BODY, spaceAfter=4, alignment=TA_LEFT,
)


def bullet(text: str) -> Paragraph:
    return Paragraph(f"&bull;&nbsp; {text}", H_BULLET)


def hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.6, color=HexColor("#E2E8F0"),
                      spaceBefore=2, spaceAfter=6)


def build():
    doc = SimpleDocTemplate(
        str(OUT), pagesize=LETTER,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title="Gerardo Barberena - CV", author="Gerardo Barberena",
    )

    story = []

    story.append(Paragraph("Gerardo Jose Barberena Jiron", H_NAME))
    story.append(Paragraph("+52 55 7853 9814", H_CONTACT))

    story.append(Paragraph("SUMMARY", H_SECTION))
    story.append(hr())
    story.append(Paragraph(
        "Seasoned AI/ML engineer with over 20 years of software development experience, "
        "evolving from big data engineering to advanced machine learning and deep learning "
        "solutions. Skilled in Python, TensorFlow, PyTorch, Spark, and Hadoop, with proven "
        "expertise designing and deploying AI-driven cybersecurity, real-time analytics, and "
        "robotics implementations on NVIDIA Jetson Nano for computer vision automation. "
        "Passionate about leveraging data to drive innovation, solve complex business "
        "challenges, and deliver robust, scalable solutions across AWS, Azure, and GCP. "
        "Experienced in harnessing large language models (LLMs) to streamline enterprise "
        "processes and accelerate automation across diverse domains.",
        H_SUMMARY,
    ))

    story.append(Paragraph("TECHNICAL SKILLS", H_SECTION))
    story.append(hr())
    for label, items in [
        ("Programming Languages", "Python, Java, C, C++, SQL, Visual Basic, C#"),
        ("Deep Learning Frameworks", "TensorFlow, PyTorch, Keras, Caffe"),
        ("Libraries &amp; Tools", "NumPy, Pandas, Scikit-learn, OpenCV, NLTK, Git, Docker"),
        ("Big Data &amp; Cloud", "Hadoop, Spark, Kafka, AWS (EC2, EMR, SageMaker), Azure, GCP, Kubernetes"),
        ("Data Visualization", "Matplotlib, Seaborn, Plotly, Power BI, Tableau"),
        ("MLOps", "Airflow, MLflow, Kubeflow, Jenkins"),
    ]:
        story.append(Paragraph(f"<b>{label}:</b> {items}", H_BODY))
        story.append(Spacer(1, 2))

    story.append(Paragraph("EXPERIENCE", H_SECTION))
    story.append(hr())

    experiences = [
        {
            "role": "Neuranta.com - AI-Driven Voice &amp; LLM Platform",
            "meta": "PRAGMATIC S.A. de C.V. &nbsp;|&nbsp; Applied Machine Learning Engineer &nbsp;|&nbsp; "
                    "Nov 2022 - Present &nbsp;|&nbsp; Python, C++, Kubernetes, Docker",
            "bullets": [
                "Developed a multimodal conversational system combining ASR (Whisper), TTS, and LLM capabilities with RAG implementation.",
                "Integrated a vector database (Milvus) for semantic retrieval and context management, enabling dynamic call flows.",
                "Orchestrated microservices with Kubernetes and Docker, ensuring high availability and horizontal scalability.",
                "Employed GPU-accelerated pipelines (NVIDIA H100) to reduce latency in real-time speech recognition and LLM-based text generation.",
            ],
        },
        {
            "role": "Xtrmedata Cybersecurity Platform",
            "meta": "PRAGMATIC S.A. de C.V. &nbsp;|&nbsp; Machine Learning Developer &nbsp;|&nbsp; "
                    "Mar 2021 - Nov 2022 &nbsp;|&nbsp; Python, TensorFlow, Spark, Docker, AWS",
            "bullets": [
                "Designed and implemented deep learning models (CNN, RNN) for real-time person counting via RTSP video feeds.",
                "Integrated ML algorithms to analyze user behavior, correlate SIEM events, and automate incident response.",
                "Leveraged Spark for large-scale data ingestion and TensorFlow for advanced threat detection.",
                "Built custom monitoring agents to collect real-time data from network devices, integrating with Spark pipelines for large-scale analysis.",
            ],
        },
        {
            "role": "Business Analytics Platform - Alsea S.A. de C.V.",
            "meta": "IT GUARDIAN &amp; CONSULTING SERVICES S.A. de C.V. &nbsp;|&nbsp; Machine Learning Developer &nbsp;|&nbsp; "
                    "Nov 2014 - Dec 2020 &nbsp;|&nbsp; Python, AWS (EC2, EMR), Spark, Hadoop",
            "bullets": [
                "Developed and deployed ML models for real-time anomaly detection and camera-based analytics.",
                "Built an end-to-end platform to monitor transactions, electric meters, and network traffic.",
                "Unified POS transaction data from multiple Alsea-owned brands (Starbucks, Domino's) to detect real-time anomalies and optimize sales operations.",
                "Built and maintained ETL pipelines on AWS (EC2, EMR) for large-scale ingestion, integrating camera feeds and electric meter data.",
            ],
        },
        {
            "role": "Financial Analytics System",
            "meta": "IT GUARDIAN &amp; CONSULTING S.A. de C.V. &nbsp;|&nbsp; Intermediate Software Engineer &nbsp;|&nbsp; "
                    "Dec 2013 - Sep 2014 &nbsp;|&nbsp; Python, Spark, Hadoop",
            "bullets": [
                "Implemented ML algorithms (A/B testing, association rules, gradient boosting) to identify trading patterns.",
                "Developed predictive models to forecast market trends, optimizing automated trading desk operations.",
                "Employed Spark on Hadoop for real-time data ingestion, feature engineering, and model training.",
                "Created interactive dashboards and real-time reporting tools for traders.",
            ],
        },
        {
            "role": "SCADA Monitoring for PEMEX",
            "meta": "SENSE SISTEMAS DE MONITOREO S.A. de C.V. &nbsp;|&nbsp; Developer &nbsp;|&nbsp; "
                    "Jan 2012 - Sep 2013 &nbsp;|&nbsp; Visual Basic, Flex, MySQL/MongoDB",
            "bullets": [
                "Integrated deep learning techniques to analyze sensor data from 1,500 gas wells in real time.",
                "Leveraged MongoDB map-reduce for geolocation-based anomaly detection and operational insights.",
                "Enabled remote command execution and real-time dashboards to improve maintenance decisions.",
                "Integrated advanced GIS mapping tools to visually correlate sensor anomalies with geographical locations.",
            ],
        },
        {
            "role": "SIAVE-ADUANAS Customs Automation",
            "meta": "SENSE SISTEMAS DE MONITOREO S.A. de C.V. &nbsp;|&nbsp; Developer &nbsp;|&nbsp; "
                    "Apr 2009 - Oct 2011 &nbsp;|&nbsp; PHP, Flash, MySQL",
            "bullets": [
                "Developed a business rules engine with ML-based heuristic predictions to analyze customs data.",
                "Enhanced anomaly detection and streamlined customs clearance processes for high-volume transactions.",
                "Implemented a real-time alert system that flagged high-risk shipments based on cargo details and historical patterns.",
                "Integrated external data sources (e.g., government databases) to enhance compliance checks.",
            ],
        },
    ]

    for exp in experiences:
        story.append(Paragraph(exp["role"], H_ROLE))
        story.append(Paragraph(exp["meta"], H_META))
        for b in exp["bullets"]:
            story.append(bullet(b))
        story.append(Spacer(1, 6))

    story.append(Paragraph("EDUCATION", H_SECTION))
    story.append(hr())
    for line in [
        "<b>National University of Engineering</b> - B.S. in Systems Engineering &nbsp;|&nbsp; Managua, Nicaragua &nbsp;|&nbsp; 1997 - 2001",
        "<b>Harmon Hall</b> - Advanced English Proficiency &nbsp;|&nbsp; Mexico City &nbsp;|&nbsp; 2007 - 2009",
        "<b>Secretaria de Educacion Publica (SEP)</b> - Examen EGAL Acuerdo 286 (Systems Engineering) - Outstanding Result &nbsp;|&nbsp; 2021",
        "<b>Platzi.com</b> - Machine Learning Engineer Program &nbsp;|&nbsp; 2022 - 2023",
    ]:
        story.append(Paragraph(line, H_BODY))
        story.append(Spacer(1, 2))

    story.append(Paragraph("CERTIFICATIONS", H_SECTION))
    story.append(hr())
    story.append(Paragraph("Platzi - Machine Learning Engineer", H_BODY))

    doc.build(story)
    print(f"PDF generated: {OUT}")


if __name__ == "__main__":
    build()
