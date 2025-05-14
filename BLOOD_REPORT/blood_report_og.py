import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os
import re
import json
import argparse
import sys
from PIL import Image
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize

# Download necessary NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('averaged_perceptron_tagger')

# Optional imports with fallbacks
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    st.warning("pytesseract not available. OCR functionality will be limited.")

try:
    import pdf2image
    PDF_IMAGE_AVAILABLE = True
except ImportError:
    PDF_IMAGE_AVAILABLE = False
    st.warning("pdf2image not available. PDF processing will be disabled.")

# Replace spaCy with NLTK for basic NLP tasks
def simple_nlp_processing(text):
    """Basic NLP processing using NLTK instead of spaCy"""
    sentences = sent_tokenize(text)
    words = word_tokenize(text)
    stop_words = set(stopwords.words('english'))
    filtered_words = [word for word in words if word.lower() not in stop_words]
    # Basic POS tagging
    pos_tags = nltk.pos_tag(filtered_words)
    
    # Extract medical terms and numbers
    medical_terms = []
    numbers = []
    
    for word, tag in pos_tags:
        if tag.startswith('N') and len(word) > 3:  # Nouns that are longer than 3 chars
            medical_terms.append(word)
        if tag == 'CD':  # Cardinal numbers
            try:
                numbers.append(float(word))
            except ValueError:
                pass
    
    return {
        'sentences': sentences,
        'medical_terms': medical_terms,
        'numbers': numbers
    }

# Try to import transformers, with proper error handling
TRANSFORMERS_AVAILABLE = False
try:
    from transformers import pipeline
    summarizer = pipeline("summarization")
    TRANSFORMERS_AVAILABLE = True
except (ImportError, RuntimeError, Exception) as e:
    st.warning(f"Advanced summarization disabled: {str(e)}")
    TRANSFORMERS_AVAILABLE = False

# Define medical terms corpus for blood reports
BLOOD_TEST_CORPUS = {
    # Complete Blood Count (CBC)
    "RBC": "Red Blood Cells",
    "WBC": "White Blood Cells",
    "Hb": "Hemoglobin",
    "HCT": "Hematocrit",
    "MCV": "Mean Corpuscular Volume",
    "MCH": "Mean Corpuscular Hemoglobin",
    "MCHC": "Mean Corpuscular Hemoglobin Concentration",
    "RDW": "Red Cell Distribution Width",
    "PLT": "Platelets",
    "MPV": "Mean Platelet Volume",
    "PDW": "Platelet Distribution Width",
    "PCT": "Plateletcrit",
    
    # White Blood Cell Differential
    "Neutrophils": "Neutrophils",
    "Lymphocytes": "Lymphocytes",
    "Monocytes": "Monocytes",
    "Eosinophils": "Eosinophils",
    "Basophils": "Basophils",
    "NeutrophilsAbs": "Absolute Neutrophil Count",
    "LymphocytesAbs": "Absolute Lymphocyte Count",
    "MonocytesAbs": "Absolute Monocyte Count",
    "EosinophilsAbs": "Absolute Eosinophil Count",
    "BasophilsAbs": "Absolute Basophil Count",
    "Bands": "Band Neutrophils",
    "Segs": "Segmented Neutrophils",
    
    # Kidney Function
    "BUN": "Blood Urea Nitrogen",
    "Creatinine": "Creatinine",
    "eGFR": "Estimated Glomerular Filtration Rate",
    "BUN/Creatinine Ratio": "BUN/Creatinine Ratio",
    "Uric Acid": "Uric Acid",
    "Cystatin C": "Cystatin C",
    
    # Electrolytes
    "Sodium": "Sodium",
    "Potassium": "Potassium",
    "Chloride": "Chloride",
    "Bicarbonate": "Bicarbonate",
    "Carbon Dioxide": "Carbon Dioxide",
    "Calcium": "Calcium",
    "Ionized Calcium": "Ionized Calcium",
    "Phosphorus": "Phosphorus",
    "Magnesium": "Magnesium",
    
    # Liver Function Tests
    "Total Protein": "Total Protein",
    "Albumin": "Albumin",
    "Globulin": "Globulin",
    "A/G Ratio": "Albumin/Globulin Ratio",
    "Total Bilirubin": "Total Bilirubin",
    "Direct Bilirubin": "Direct Bilirubin",
    "Indirect Bilirubin": "Indirect Bilirubin",
    "Alkaline Phosphatase": "Alkaline Phosphatase",
    "ALT": "Alanine Aminotransferase",
    "AST": "Aspartate Aminotransferase",
    "GGT": "Gamma-Glutamyl Transferase",
    "LDH": "Lactate Dehydrogenase",
    
    # Lipid Panel
    "Cholesterol": "Total Cholesterol",
    "Triglycerides": "Triglycerides",
    "HDL": "High-Density Lipoprotein",
    "LDL": "Low-Density Lipoprotein",
    "VLDL": "Very Low-Density Lipoprotein",
    "Non-HDL": "Non-HDL Cholesterol",
    "TC/HDL Ratio": "Total Cholesterol/HDL Ratio",
    "LDL/HDL Ratio": "LDL/HDL Ratio",
    "ApoA": "Apolipoprotein A",
    "ApoB": "Apolipoprotein B",
    "Lp(a)": "Lipoprotein(a)",
    
    # Blood Glucose Tests
    "Glucose": "Glucose",
    "FBS": "Fasting Blood Sugar",
    "RBS": "Random Blood Sugar",
    "HbA1c": "Glycated Hemoglobin",
    "Insulin": "Insulin",
    "HOMA-IR": "Homeostatic Model Assessment for Insulin Resistance",
    "C-Peptide": "C-Peptide",
    
    # Thyroid Function Tests
    "TSH": "Thyroid Stimulating Hormone",
    "T3": "Triiodothyronine",
    "T4": "Thyroxine",
    "Free T3": "Free Triiodothyronine",
    "Free T4": "Free Thyroxine",
    "T3 Uptake": "T3 Uptake",
    "Thyroglobulin": "Thyroglobulin",
    "TBG": "Thyroxine Binding Globulin",
    
    # Iron Studies
    "Iron": "Iron",
    "TIBC": "Total Iron Binding Capacity",
    "UIBC": "Unsaturated Iron Binding Capacity",
    "Transferrin": "Transferrin",
    "Transferrin Saturation": "Transferrin Saturation",
    "Ferritin": "Ferritin",
    
    # Vitamins
    "Vitamin B12": "Vitamin B12",
    "Folate": "Folate",
    "Vitamin D": "Vitamin D",
    "25-OH Vitamin D": "25-Hydroxyvitamin D",
    "1,25-OH Vitamin D": "1,25-Dihydroxyvitamin D",
    "Vitamin A": "Vitamin A",
    "Vitamin E": "Vitamin E",
    "Vitamin K": "Vitamin K",
    
    # Inflammatory Markers
    "CRP": "C-Reactive Protein",
    "hsCRP": "High-Sensitivity C-Reactive Protein",
    "ESR": "Erythrocyte Sedimentation Rate",
    "Procalcitonin": "Procalcitonin",
    
    # Coagulation Studies
    "PT": "Prothrombin Time",
    "INR": "International Normalized Ratio",
    "aPTT": "Activated Partial Thromboplastin Time",
    "Fibrinogen": "Fibrinogen",
    "D-dimer": "D-dimer",
    
    # Cardiac Markers
    "Troponin I": "Troponin I",
    "Troponin T": "Troponin T",
    "CK": "Creatine Kinase",
    "CK-MB": "Creatine Kinase-MB",
    "BNP": "B-Type Natriuretic Peptide",
    "NT-proBNP": "N-Terminal pro-B-Type Natriuretic Peptide",
    "Homocysteine": "Homocysteine",
    
    # Tumor Markers
    "PSA": "Prostate Specific Antigen",
    "Free PSA": "Free Prostate Specific Antigen",
    "CEA": "Carcinoembryonic Antigen",
    "AFP": "Alpha-Fetoprotein",
    "CA 19-9": "Cancer Antigen 19-9",
    "CA 125": "Cancer Antigen 125",
    "CA 15-3": "Cancer Antigen 15-3",
    
    # Autoimmune Markers
    "ANA": "Antinuclear Antibody",
    "RF": "Rheumatoid Factor",
    "Anti-CCP": "Anti-Cyclic Citrullinated Peptide",
    "Anti-dsDNA": "Anti-Double Stranded DNA",
    
    # Allergy Testing
    "IgE": "Immunoglobulin E",
    "IgG": "Immunoglobulin G",
    "IgA": "Immunoglobulin A",
    "IgM": "Immunoglobulin M",
    
    # Other Common Tests
    "Amylase": "Amylase",
    "Lipase": "Lipase",
    "Cortisol": "Cortisol",
    "Testosterone": "Testosterone",
    "Free Testosterone": "Free Testosterone",
    "Estradiol": "Estradiol",
    "Progesterone": "Progesterone",
    "HCG": "Human Chorionic Gonadotropin",
    "FSH": "Follicle Stimulating Hormone",
    "LH": "Luteinizing Hormone",
    "Prolactin": "Prolactin"
}

# Define normal ranges for common blood tests
NORMAL_RANGES = {
    # Complete Blood Count
    "RBC": (4.5, 5.9, "10^6/μL"),
    "WBC": (4.5, 11.0, "10^3/μL"),
    "Hb": (13.5, 17.5, "g/dL"),
    "HCT": (41.0, 50.0, "%"),
    "MCV": (80, 100, "fL"),
    "MCH": (27, 33, "pg"),
    "MCHC": (32, 36, "g/dL"),
    "RDW": (11.5, 14.5, "%"),
    "PLT": (150, 450, "10^3/μL"),
    "MPV": (9.4, 12.3, "fL"),
    
    # White Blood Cell Differential
    "Neutrophils": (45, 75, "%"),
    "Lymphocytes": (20, 40, "%"),
    "Monocytes": (2, 10, "%"),
    "Eosinophils": (1, 6, "%"),
    "Basophils": (0, 2, "%"),
    "NeutrophilsAbs": (1.8, 7.7, "10^3/μL"),
    "LymphocytesAbs": (1.0, 4.8, "10^3/μL"),
    "MonocytesAbs": (0.2, 0.8, "10^3/μL"),
    "EosinophilsAbs": (0.0, 0.5, "10^3/μL"),
    "BasophilsAbs": (0.0, 0.2, "10^3/μL"),
    
    # Kidney Function
    "BUN": (7, 20, "mg/dL"),
    "Creatinine": (0.7, 1.3, "mg/dL"),
    "eGFR": (90, 120, "mL/min/1.73m²"),
    "BUN/Creatinine Ratio": (10, 20, "ratio"),
    "Uric Acid": (3.5, 7.2, "mg/dL"),
    
    # Electrolytes
    "Sodium": (135, 145, "mEq/L"),
    "Potassium": (3.5, 5.0, "mEq/L"),
    "Chloride": (96, 106, "mEq/L"),
    "Bicarbonate": (23, 29, "mEq/L"),
    "Carbon Dioxide": (23, 29, "mEq/L"),
    "Calcium": (8.5, 10.5, "mg/dL"),
    "Ionized Calcium": (4.5, 5.6, "mg/dL"),
    "Phosphorus": (2.5, 4.5, "mg/dL"),
    "Magnesium": (1.7, 2.2, "mg/dL"),
    
    # Liver Function Tests
    "Total Protein": (6.0, 8.3, "g/dL"),
    "Albumin": (3.5, 5.0, "g/dL"),
    "Globulin": (2.3, 3.5, "g/dL"),
    "A/G Ratio": (1.2, 2.2, "ratio"),
    "Total Bilirubin": (0.1, 1.2, "mg/dL"),
    "Direct Bilirubin": (0.0, 0.3, "mg/dL"),
    "Indirect Bilirubin": (0.1, 0.9, "mg/dL"),
    "Alkaline Phosphatase": (44, 147, "U/L"),
    "ALT": (7, 56, "U/L"),
    "AST": (10, 40, "U/L"),
    "GGT": (8, 61, "U/L"),
    "LDH": (140, 280, "U/L"),
    
    # Lipid Panel
    "Cholesterol": (0, 200, "mg/dL"),
    "Triglycerides": (0, 150, "mg/dL"),
    "HDL": (40, 60, "mg/dL"),
    "LDL": (0, 100, "mg/dL"),
    "VLDL": (5, 40, "mg/dL"),
    "TC/HDL Ratio": (0, 5, "ratio"),
    
    # Blood Glucose
    "Glucose": (70, 99, "mg/dL"),
    "FBS": (70, 99, "mg/dL"),
    "HbA1c": (4.0, 5.6, "%"),
    "Insulin": (2, 20, "μIU/mL"),
    
    # Thyroid Function
    "TSH": (0.4, 4.0, "mIU/L"),
    "T3": (80, 200, "ng/dL"),
    "T4": (5.0, 12.0, "μg/dL"),
    "Free T3": (2.3, 4.2, "pg/mL"),
    "Free T4": (0.9, 1.7, "ng/dL"),
    
    # Iron Studies
    "Iron": (60, 170, "μg/dL"),
    "TIBC": (240, 450, "μg/dL"),
    "Transferrin Saturation": (15, 50, "%"),
    "Ferritin": (30, 400, "ng/mL"),
    
    # Vitamins
    "Vitamin B12": (200, 900, "pg/mL"),
    "Folate": (2.7, 17.0, "ng/mL"),
    "Vitamin D": (30, 100, "ng/mL"),
    "25-OH Vitamin D": (30, 100, "ng/mL"),
    
    # Inflammatory Markers
    "CRP": (0, 10, "mg/L"),
    "hsCRP": (0, 3, "mg/L"),
    "ESR": (0, 15, "mm/hr"),
    
    # Coagulation Studies
    "PT": (11, 13.5, "seconds"),
    "INR": (0.8, 1.2, "ratio"),
    "aPTT": (25, 35, "seconds"),
    "Fibrinogen": (200, 400, "mg/dL"),
    "D-dimer": (0, 0.5, "μg/mL"),
    
    # Cardiac Markers
    "Troponin I": (0, 0.04, "ng/mL"),
    "Troponin T": (0, 0.01, "ng/mL"),
    "CK": (30, 200, "U/L"),
    "CK-MB": (30, 200, "U/L"),
    "BNP": (0, 100, "pg/mL"),
    "NT-proBNP": (0, 100, "pg/mL"),
    "Homocysteine": (0, 20, "μmol/L"),
    
    # Tumor Markers
    "PSA": (0, 4, "ng/mL"),
    "Free PSA": (0, 4, "ng/mL"),
    "CEA": (0, 5, "ng/mL"),
    "AFP": (0, 10, "ng/mL"),
    "CA 19-9": (0, 37, "U/mL"),
    "CA 125": (0, 35, "U/mL"),
    "CA 15-3": (0, 20, "ng/mL"),
    
    # Autoimmune Markers
    "ANA": (0, 100, "IU/mL"),
    "RF": (0, 10, "IU/mL"),
    "Anti-CCP": (0, 10, "IU/mL"),
    "Anti-dsDNA": (0, 10, "IU/mL"),
    
    # Allergy Testing
    "IgE": (0, 100, "IU/mL"),
    "IgG": (0, 100, "IU/mL"),
    "IgA": (0, 100, "IU/mL"),
    "IgM": (0, 100, "IU/mL"),
    
    # Other Common Tests
    "Amylase": (0, 100, "U/L"),
    "Lipase": (0, 100, "U/L"),
    "Cortisol": (0, 20, "μg/dL"),
    "Testosterone": (0, 1000, "ng/dL"),
    "Free Testosterone": (0, 1000, "ng/dL"),
    "Estradiol": (0, 1.5, "ng/dL"),
    "Progesterone": (0, 5, "ng/dL"),
    "HCG": (0, 50, "mIU/L"),
    "FSH": (0, 10, "mIU/L"),
    "LH": (0, 10, "mIU/L"),
    "Prolactin": (0, 50, "ng/L")
}

# Define descriptions for test categories
CATEGORY_DESCRIPTIONS = {
    "Complete Blood Count (CBC)": "The CBC is a fundamental blood panel that examines blood cells (red, white, and platelets). It's used to evaluate overall health and detect disorders like anemia, infection, and various blood diseases.",
    "White Blood Cell Differential": "This panel breaks down the different types of white blood cells (neutrophils, lymphocytes, etc.) to help identify specific infections, inflammation, or immune system disorders.",
    "Kidney Function": "These tests evaluate how well your kidneys filter waste from your blood, maintain fluid balance, and regulate electrolytes. Abnormalities may indicate kidney disease or damage.",
    "Electrolytes": "Essential minerals that carry an electric charge, electrolytes affect hydration, muscle function, pH balance, and nervous system function. They're critical for many bodily processes.",
    "Liver Function": "These tests measure proteins, enzymes, and substances that are produced or processed by the liver, helping detect liver damage, disease, or abnormal function.",
    "Lipid Panel": "This group measures fats and fatty substances in the blood, including cholesterol and triglycerides, to assess cardiovascular health and risk of heart disease.",
    "Blood Glucose": "These tests measure blood sugar levels and related markers to diagnose and monitor diabetes, prediabetes, and other metabolic disorders.",
    "Thyroid Function": "These tests evaluate how well the thyroid gland is functioning by measuring various hormones. The thyroid regulates metabolism, energy, and many bodily functions.",
    "Iron Studies": "These tests assess iron storage, transport, and availability in the body, helping diagnose conditions like anemia, hemochromatosis, and other disorders affecting iron metabolism.",
    "Vitamins": "These measurements assess vitamin levels in the blood to identify deficiencies or excesses that can affect overall health and specific bodily functions.",
    "Inflammatory Markers": "These tests detect and measure inflammation in the body, which can indicate infection, autoimmune disorders, or other inflammatory conditions.",
    "Coagulation Studies": "These tests evaluate how well your blood clots, helping diagnose bleeding disorders or clotting abnormalities.",
    "Cardiac Markers": "These tests detect proteins or enzymes released when the heart is damaged, helping diagnose heart attacks and assess heart health.",
    "Other": "Miscellaneous tests that don't fit into the standard categories but provide valuable diagnostic information."
}

# Expanded indications for abnormal values
def get_expanded_low_indication(test):
    """Return detailed possible indications for low test values"""
    indications = {
        "RBC": {
            "conditions": "anemia, blood loss, nutritional deficiencies (iron, vitamin B12, folate), bone marrow problems, chronic kidney disease, or certain medications",
            "details": "Low red blood cells reduce oxygen delivery to tissues, causing fatigue, weakness, and shortness of breath. This may require further investigation with iron studies, vitamin levels, or bone marrow examination."
        },
        "WBC": {
            "conditions": "infection, inflammation, stress, or certain types of cancer",
            "details": "Low white blood cells can indicate an infection or a weakened immune system. Consult with a healthcare provider for further evaluation."
        },
        "Hb": {
            "conditions": "anemia, blood loss, nutritional deficiencies, or chronic diseases",
            "details": "Low hemoglobin levels can cause fatigue, weakness, and shortness of breath. This may require further investigation with iron studies or blood transfusion."
        },
        "HCT": {
            "conditions": "anemia, blood loss, or overhydration",
            "details": "Low hematocrit levels can indicate anemia, blood loss, or overhydration. Consult with a healthcare provider for further evaluation."
        },
        "PLT": {
            "conditions": "bone marrow problems, autoimmune conditions, or increased platelet destruction",
            "details": "Low platelets can increase the risk of bleeding and bruising. Consult with a healthcare provider for further evaluation."
        },
        "Glucose": {
            "conditions": "hypoglycemia, which may be due to insulin excess, liver disease, or certain medications",
            "details": "Low blood sugar levels can cause symptoms like dizziness, sweating, and hunger. Consult with a healthcare provider for further evaluation."
        },
        "Sodium": {
            "conditions": "overhydration, kidney problems, heart failure, or certain medications",
            "details": "Low sodium levels can cause symptoms like fatigue, weakness, and swelling. Consult with a healthcare provider for further evaluation."
        },
        "Potassium": {
            "conditions": "kidney issues, diarrhea, vomiting, or certain medications",
            "details": "Low potassium levels can cause symptoms like muscle weakness, irregular heartbeat, or constipation. Consult with a healthcare provider for further evaluation."
        },
        "Albumin": {
            "conditions": "liver disease, malnutrition, or kidney problems",
            "details": "Low albumin levels can cause swelling in the body, weakness, or fatigue. Consult with a healthcare provider for further evaluation."
        },
        "HDL": {
            "conditions": "increased cardiovascular risk",
            "details": "Low HDL cholesterol levels can increase the risk of heart disease. Consult with a healthcare provider for further evaluation."
        },
        "Iron": {
            "conditions": "iron deficiency anemia or chronic blood loss",
            "details": "Low iron levels can cause anemia, fatigue, and weakness. Consult with a healthcare provider for further evaluation."
        }
    }
    
    default_info = {
        "conditions": "various medical conditions requiring further clinical correlation",
        "details": "Abnormal values should be interpreted in the context of your overall health, symptoms, and other test results. Consult with a healthcare provider for proper diagnosis."
    }
    
    return indications.get(test, default_info)

def get_expanded_high_indication(test):
    """Return detailed possible indications for high test values"""
    indications = {
        "RBC": {
            "conditions": "polycythemia vera, dehydration, lung diseases, smoking, high altitude, or erythrocytosis",
            "details": "Elevated red blood cells increase blood viscosity and can impair circulation, increasing risk of clots. Primary polycythemia (bone marrow disorder) should be distinguished from secondary causes like hypoxia."
        },
        "WBC": {
            "conditions": "infection, inflammation, stress, or certain types of cancer",
            "details": "High white blood cells can indicate an infection or a weakened immune system. Consult with a healthcare provider for further evaluation."
        },
        "Hb": {
            "conditions": "polycythemia, dehydration, or lung disease",
            "details": "High hemoglobin levels can cause symptoms like shortness of breath, fatigue, and chest pain. Consult with a healthcare provider for further evaluation."
        },
        "HCT": {
            "conditions": "polycythemia, dehydration, or certain lung conditions",
            "details": "High hematocrit levels can indicate polycythemia, dehydration, or certain lung conditions. Consult with a healthcare provider for further evaluation."
        },
        "PLT": {
            "conditions": "infection, inflammation, or certain disorders",
            "details": "High platelets can increase the risk of blood clots. Consult with a healthcare provider for further evaluation."
        },
        "Glucose": {
            "conditions": "diabetes, stress, certain medications, or pancreatic issues",
            "details": "High blood sugar levels can cause symptoms like frequent urination, thirst, and increased appetite. Consult with a healthcare provider for further evaluation."
        },
        "Creatinine": {
            "conditions": "kidney problems, muscle breakdown, or dehydration",
            "details": "High creatinine levels can indicate kidney problems, muscle breakdown, or dehydration. Consult with a healthcare provider for further evaluation."
        },
        "BUN": {
            "conditions": "kidney problems, dehydration, high protein diet, or gastrointestinal bleeding",
            "details": "High blood urea nitrogen levels can indicate kidney problems, dehydration, high protein diet, or gastrointestinal bleeding. Consult with a healthcare provider for further evaluation."
        },
        "Sodium": {
            "conditions": "dehydration, diabetes insipidus, or excessive salt intake",
            "details": "High sodium levels can cause symptoms like swelling, thirst, and confusion. Consult with a healthcare provider for further evaluation."
        },
        "Potassium": {
            "conditions": "kidney disease, certain medications, or cell damage",
            "details": "High potassium levels can cause symptoms like muscle weakness, irregular heartbeat, or heart problems. Consult with a healthcare provider for further evaluation."
        },
        "Total Bilirubin": {
            "conditions": "liver problems, bile duct obstruction, or certain types of anemia",
            "details": "High total bilirubin levels can indicate liver problems, bile duct obstruction, or certain types of anemia. Consult with a healthcare provider for further evaluation."
        },
        "ALT": {
            "conditions": "liver damage, hepatitis, or certain medications",
            "details": "High alanine transaminase levels can indicate liver damage, hepatitis, or certain medications. Consult with a healthcare provider for further evaluation."
        },
        "AST": {
            "conditions": "liver damage, muscle injury, or heart problems",
            "details": "High aspartate transaminase levels can indicate liver damage, muscle injury, or heart problems. Consult with a healthcare provider for further evaluation."
        },
        "Cholesterol": {
            "conditions": "increased cardiovascular risk, genetic conditions, or poor diet",
            "details": "High cholesterol levels can increase the risk of heart disease. Consult with a healthcare provider for further evaluation."
        },
        "Triglycerides": {
            "conditions": "increased cardiovascular risk, diabetes, obesity, or alcohol consumption",
            "details": "High triglyceride levels can increase the risk of heart disease. Consult with a healthcare provider for further evaluation."
        },
        "LDL": {
            "conditions": "increased cardiovascular risk",
            "details": "High LDL cholesterol levels can increase the risk of heart disease. Consult with a healthcare provider for further evaluation."
        },
        "TSH": {
            "conditions": "hypothyroidism or thyroid medication issues",
            "details": "High thyroid-stimulating hormone levels can indicate hypothyroidism or thyroid medication issues. Consult with a healthcare provider for further evaluation."
        },
        "CRP": {
            "conditions": "inflammation, infection, or tissue damage",
            "details": "High C-reactive protein levels can indicate inflammation, infection, or tissue damage. Consult with a healthcare provider for further evaluation."
        }
    }
    
    default_info = {
        "conditions": "various medical conditions requiring further clinical correlation",
        "details": "Abnormal values should be interpreted in the context of your overall health, symptoms, and other test results. Consult with a healthcare provider for proper diagnosis."
    }
    
    return indications.get(test, default_info)

def extract_text_from_image(image):
    """Extract text from an uploaded image using OCR"""
    if TESSERACT_AVAILABLE:
        return pytesseract.image_to_string(image)
    else:
        st.error("OCR functionality requires pytesseract. Please install it.")
        return ""

def extract_text_from_pdf(pdf_file):
    """Convert PDF to images and extract text using OCR"""
    if not PDF_IMAGE_AVAILABLE:
        st.error("PDF processing requires pdf2image. Please install it.")
        return ""
    
    if not TESSERACT_AVAILABLE:
        st.error("OCR functionality requires pytesseract. Please install it.")
        return ""
    
    images = pdf2image.convert_from_bytes(pdf_file.read())
    text = ""
    for image in images:
        text += pytesseract.image_to_string(image)
    return text

def find_hemoglobin(text):
    """Special function to specifically find hemoglobin values in text"""
    # Common formats for hemoglobin
    hb_patterns = [
        r'[Hh]emoglobin\s*:?\s*(\d+\.?\d*)\s*g/?d?[lL]?',
        r'[Hh]b\s*:?\s*(\d+\.?\d*)\s*g/?d?[lL]?',
        r'[Hh][Gg][Bb]\s*:?\s*(\d+\.?\d*)',
        r'[Hh]emoglobin[^0-9]*(\d+\.?\d*)\s*g',
        r'[Hh]b[^0-9]*(\d+\.?\d*)\s*g',
        r'hemoglobin[\s:=]+(\d+\.?\d*)',
        r'(\d+\.?\d*)\s*g/?d?[lL]\s*hemoglobin',
        r'(\d+\.?\d*)\s*g/?d?[lL]\s*hb',
    ]
    
    for pattern in hb_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                value = float(match.group(1))
                # Only accept reasonable hemoglobin values
                if 5 <= value <= 25:
                    return value
            except ValueError:
                pass
                
    # Look for high values in g/L (range typically 120-175)
    g_l_patterns = [
        r'[Hh]emoglobin\s*:?\s*(\d{3}\.?\d*)\s*g/?[lL]',
        r'[Hh]b\s*:?\s*(\d{3}\.?\d*)\s*g/?[lL]'
    ]
    
    for pattern in g_l_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                value = float(match.group(1))
                if 100 <= value <= 200:  # Typical g/L range
                    return value / 10  # Convert to g/dL
            except ValueError:
                pass
                
    # Scan through any line with "hemoglobin" and look for numbers
    for line in text.split('\n'):
        if re.search(r'[Hh]emoglobin|[Hh]b\b|[Hh][Gg][Bb]', line, re.IGNORECASE):
            numbers = re.findall(r'(\d+\.?\d*)', line)
            for num in numbers:
                try:
                    value = float(num)
                    if 5 <= value <= 25:  # g/dL range
                        return value
                    elif 100 <= value <= 200:  # g/L range
                        return value / 10
                except ValueError:
                    pass
                
    return None

def find_wbc(text):
    """Special function to specifically find white blood cell values in text"""
    # Common formats for WBC
    wbc_patterns = [
        r'[Ww]hite\s*[Bb]lood\s*[Cc]ell\s*[Cc]ount\s*:?\s*(\d+\.?\d*)',
        r'[Ww]hite\s*[Bb]lood\s*[Cc]ells?\s*:?\s*(\d+\.?\d*)',
        r'[Ww][Bb][Cc]\s*:?\s*(\d+\.?\d*)',
        r'[Ww][Bb][Cc][^0-9]*(\d+\.?\d*)',
        r'[Ll]eukocytes?\s*:?\s*(\d+\.?\d*)',
        r'[Tt]otal\s*[Ll]eukocyte\s*[Cc]ount\s*:?\s*(\d+\.?\d*)',
        r'[Tt][Ll][Cc]\s*:?\s*(\d+\.?\d*)',
        r'(\d+\.?\d*)\s*[Kk]?\/[μµ][Ll]\s*[Ww][Bb][Cc]',
        r'(\d+\.?\d*)\s*[Kk]?\/[μµ][Ll]\s*[Ww]hite\s*[Bb]lood\s*[Cc]ells',
        r'(\d+\.?\d*)\s*[Kk]?\/[μµ][Ll]\s*[Ll]eukocytes',
        r'(\d+\.?\d*)\s*10\^3\/[μµ][Ll]\s*[Ww][Bb][Cc]',
        r'(\d+\.?\d*)\s*10\^3\/[μµ][Ll]\s*[Ww]hite\s*[Cc]ells',
        r'[Ww][Bb][Cc][\s:=]+(\d+\.?\d*)',
        r'[Ll]eukocytes?[\s:=]+(\d+\.?\d*)',
    ]
    
    for pattern in wbc_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                value = float(match.group(1))
                # Only accept reasonable WBC values (in thousands/μL)
                if 0.5 <= value <= 50:
                    return value
                # Handle SI units (10^9/L)
                elif 0.5 <= value <= 50:
                    return value  # Same range for both units
            except ValueError:
                pass
    
    # Scan through any line with "WBC" and look for numbers
    for line in text.split('\n'):
        if re.search(r'[Ww][Bb][Cc]|[Ww]hite\s*[Bb]lood\s*[Cc]ell|[Ll]eukocyte|[Tt][Ll][Cc]', line, re.IGNORECASE):
            # Look for numbers that could be WBC count
            numbers = re.findall(r'(\d+\.?\d*)', line)
            for num in numbers:
                try:
                    value = float(num)
                    if 0.5 <= value <= 50:  # Typical range for WBC in K/μL or 10^9/L
                        return value
                except ValueError:
                    pass
            
    # Look for tabular format with "WBC" in one cell and value in the next
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if re.search(r'[Ww][Bb][Cc]|[Ww]hite\s*[Bb]lood\s*[Cc]ell|[Ll]eukocyte', line, re.IGNORECASE) and i < len(lines) - 1:
            # Check next line for possible values
            next_line = lines[i+1]
            numbers = re.findall(r'(\d+\.?\d*)', next_line)
            for num in numbers:
                try:
                    value = float(num)
                    if 0.5 <= value <= 50:  # Typical range for WBC
                        return value
                except ValueError:
                    pass
                
    return None

def extract_blood_values(text):
    """Extract blood test values from the text"""
    results = {}
    
    # First try dedicated extraction for critical values
    hb_value = find_hemoglobin(text)
    if hb_value:
        results["Hb"] = hb_value
    
    # Special extraction for WBC
    wbc_value = find_wbc(text)
    if wbc_value:
        results["WBC"] = wbc_value
    
    # Use the simple NLP processing to help with medical term identification
    nlp_results = simple_nlp_processing(text)
    
    # Create alternative names and abbreviations for common tests
    alternative_names = {
        # Complete Blood Count (CBC)
        "Hb": ["Hb", "HGB", "Hemoglobin", "Haemoglobin", "HG", "Hgb", "hemoglobin", "haemoglobin", "Hgb"],
        "RBC": ["RBC", "Red Blood Cell", "Red Blood Cells", "Red blood count", "Erythrocytes", "red cells", "red cell count", "erythrocyte count"],
        "WBC": ["WBC", "White Blood Cell", "White Blood Cells", "White blood count", "Leukocytes", "white cells", "white cell count", "leukocyte count", "TLC", "total leukocyte count", "WBC count", "Leukocyte count"],
        "HCT": ["HCT", "Hct", "Hematocrit", "PCV", "Packed Cell Volume", "hematocrit", "haematocrit"],
        "MCV": ["MCV", "Mean Corpuscular Volume", "Mean Cell Volume"],
        "MCH": ["MCH", "Mean Corpuscular Hemoglobin", "Mean Cell Hemoglobin"],
        "MCHC": ["MCHC", "Mean Corpuscular Hemoglobin Concentration", "Mean Cell Hemoglobin Concentration"],
        "RDW": ["RDW", "Red Cell Distribution Width", "RDW-CV", "RDW-SD"],
        "PLT": ["PLT", "Platelet", "Platelets", "Thrombocytes", "platelet count", "Plt count", "Thrombocyte count"],
        "MPV": ["MPV", "Mean Platelet Volume"],
        
        # White Blood Cell Differential
        "Neutrophils": ["Neutrophils", "Neutrophil", "Neut", "Neutro", "Polymorphs", "Polys", "PMN", "Segs", "Segmented neutrophils"],
        "Lymphocytes": ["Lymphocytes", "Lymphocyte", "Lymphs", "Lympho"],
        "Monocytes": ["Monocytes", "Monocyte", "Mono"],
        "Eosinophils": ["Eosinophils", "Eosinophil", "Eos"],
        "Basophils": ["Basophils", "Basophil", "Baso"],
        "NeutrophilsAbs": ["Absolute Neutrophil Count", "ANC", "Neutrophils Absolute", "Abs Neutrophils", "Neutrophil count", "Neutrophils #"],
        "LymphocytesAbs": ["Absolute Lymphocyte Count", "ALC", "Lymphocytes Absolute", "Abs Lymphocytes", "Lymphocyte count", "Lymphocytes #"],
        
        # Kidney Function Tests
        "BUN": ["BUN", "Blood Urea Nitrogen", "Urea Nitrogen", "Urea", "Blood Urea"],
        "Creatinine": ["Creatinine", "CREA", "Cr", "creatinine", "Serum Creatinine"],
        "eGFR": ["eGFR", "Estimated GFR", "Glomerular Filtration Rate", "Est. GFR"],
        
        # Electrolytes
        "Sodium": ["Sodium", "Na", "Na+", "Serum Sodium"],
        "Potassium": ["Potassium", "K", "K+", "Serum Potassium"],
        "Chloride": ["Chloride", "Cl", "Cl-", "Serum Chloride"],
        "Bicarbonate": ["Bicarbonate", "HCO3", "HCO3-", "CO2", "Carbon Dioxide"],
        "Calcium": ["Calcium", "Ca", "Ca++", "Serum Calcium", "Total Calcium"],
        "Phosphorus": ["Phosphorus", "Phosphate", "PO4", "P"],
        "Magnesium": ["Magnesium", "Mg", "Mg++"],
        
        # Liver Function Tests
        "Total Protein": ["Total Protein", "TP", "Protein, Total", "Serum Protein"],
        "Albumin": ["Albumin", "Alb", "Serum Albumin"],
        "Globulin": ["Globulin", "Glob", "Serum Globulin"],
        "Total Bilirubin": ["Total Bilirubin", "TBIL", "Bilirubin, Total", "Bilirubin Total"],
        "Direct Bilirubin": ["Direct Bilirubin", "DBIL", "Conjugated Bilirubin", "Bilirubin Direct"],
        "Alkaline Phosphatase": ["Alkaline Phosphatase", "ALP", "AlkPhos", "Alk Phos"],
        "ALT": ["ALT", "Alanine Aminotransferase", "SGPT", "Alanine transaminase"],
        "AST": ["AST", "Aspartate Aminotransferase", "SGOT", "Aspartate transaminase"],
        "GGT": ["GGT", "Gamma-Glutamyl Transferase", "Gamma GT", "GGTP"],
        
        # Lipid Panel
        "Cholesterol": ["Cholesterol", "CHOL", "Total Cholesterol", "TC", "T. Chol", "cholesterol"],
        "Triglycerides": ["Triglycerides", "TG", "TRIG", "Trigs"],
        "HDL": ["HDL", "HDL Cholesterol", "HDL-C", "High-Density Lipoprotein"],
        "LDL": ["LDL", "LDL Cholesterol", "LDL-C", "Low-Density Lipoprotein"],
        "VLDL": ["VLDL", "VLDL Cholesterol", "Very Low-Density Lipoprotein"],
        
        # Blood Glucose Tests
        "Glucose": ["Glucose", "GLU", "Blood Glucose", "Serum Glucose", "blood sugar", "BS"],
        "FBS": ["FBS", "Fasting Blood Sugar", "Fasting Glucose", "Fasting Blood Glucose"],
        "HbA1c": ["HbA1c", "A1c", "Glycated Hemoglobin", "Glycosylated Hemoglobin", "Glycohemoglobin", "Hemoglobin A1c"],
        
        # Thyroid Function Tests
        "TSH": ["TSH", "Thyroid Stimulating Hormone", "Thyrotropin"],
        "T3": ["T3", "Triiodothyronine", "Total T3"],
        "T4": ["T4", "Thyroxine", "Total T4"],
        "Free T3": ["Free T3", "FT3", "Free Triiodothyronine"],
        "Free T4": ["Free T4", "FT4", "Free Thyroxine"],
        
        # Iron Studies
        "Iron": ["Iron", "Serum Iron", "Fe"],
        "TIBC": ["TIBC", "Total Iron Binding Capacity"],
        "Ferritin": ["Ferritin", "Serum Ferritin"],
        "Transferrin Saturation": ["Transferrin Saturation", "TSAT", "Iron Saturation", "% Saturation", "Transferrin Sat"],
        
        # Vitamins
        "Vitamin B12": ["Vitamin B12", "B12", "Cobalamin"],
        "Folate": ["Folate", "Folic Acid", "Serum Folate"],
        "Vitamin D": ["Vitamin D", "25-OH Vitamin D", "25-Hydroxyvitamin D", "25(OH)D", "Calcidiol"],
        
        # Inflammatory Markers
        "CRP": ["CRP", "C-Reactive Protein"],
        "hsCRP": ["hsCRP", "High-Sensitivity CRP", "hs-CRP", "High sensitive CRP"],
        "ESR": ["ESR", "Erythrocyte Sedimentation Rate", "Sed Rate", "Sedimentation Rate"],
        
        # Coagulation Studies
        "PT": ["PT", "Prothrombin Time"],
        "INR": ["INR", "International Normalized Ratio"],
        "aPTT": ["aPTT", "PTT", "Activated Partial Thromboplastin Time", "Partial Thromboplastin Time"],
        
        # Cardiac Markers
        "Troponin I": ["Troponin I", "cTnI", "Cardiac Troponin I"],
        "Troponin T": ["Troponin T", "cTnT", "Cardiac Troponin T"],
        
        # Other Common Tests
        "Uric Acid": ["Uric Acid", "UA"],
        "Amylase": ["Amylase", "Serum Amylase"],
        "Lipase": ["Lipase", "Serum Lipase"]
    }
    
    # Process each line
    for line in text.split('\n'):
        # Skip empty lines
        if not line.strip():
            continue
        
        # Try common patterns for blood test values
        for test, aliases in alternative_names.items():
            # Skip hemoglobin if we already found it
            if test == "Hb" and "Hb" in results:
                continue
                
            for alias in aliases:
                # Try various patterns:
                # Pattern 1: "Test Name: 12.3 unit"
                pattern1 = fr'{alias}\s*:?\s*(\d+\.?\d*)'
                # Pattern 2: "Test Name = 12.3 unit"
                pattern2 = fr'{alias}\s*=\s*(\d+\.?\d*)'
                # Pattern 3: "Test Name 12.3 unit"
                pattern3 = fr'{alias}\s+(\d+\.?\d*)'
                # Pattern 4: "12.3 unit Test Name"
                pattern4 = fr'(\d+\.?\d*)\s+{alias}'
                # Pattern 5: Test separated by newline from value
                if line.strip() == alias:
                    next_line_index = text.split('\n').index(line) + 1
                    if next_line_index < len(text.split('\n')):
                        next_line = text.split('\n')[next_line_index]
                        number_match = re.search(r'^\s*(\d+\.?\d*)', next_line)
                        if number_match:
                            try:
                                results[test] = float(number_match.group(1))
                                break
                            except ValueError:
                                pass
                
                match = (re.search(pattern1, line, re.IGNORECASE) or 
                         re.search(pattern2, line, re.IGNORECASE) or 
                         re.search(pattern3, line, re.IGNORECASE) or 
                         re.search(pattern4, line, re.IGNORECASE))
                
                if match:
                    try:
                        results[test] = float(match.group(1))
                        break
                    except ValueError:
                        pass
            
            # If we found this test, move to the next
            if test in results:
                break
    
    # Look for the standard test names if we haven't found them with the aliases
    for test in BLOOD_TEST_CORPUS.keys():
        if test not in results:  # Only look for tests we haven't found yet
            pattern1 = fr'{test}\s*:?\s*(\d+\.?\d*)'
            pattern2 = fr'{test.lower()}\s*:?\s*(\d+\.?\d*)'
            pattern3 = fr'{BLOOD_TEST_CORPUS[test]}\s*:?\s*(\d+\.?\d*)'
            
            # Search in each line
            for line in text.split('\n'):
                match = re.search(pattern1, line) or re.search(pattern2, line) or re.search(pattern3, line)
                if match:
                    try:
                        results[test] = float(match.group(1))
                        break
                    except ValueError:
                        pass
    
    # If we still haven't found much, try the NLTK approach
    if len(results) < 10:  # Look for more values if we haven't found many
        for term in nlp_results['medical_terms']:
            # Check if the term is related to any blood test
            for test, full_name in BLOOD_TEST_CORPUS.items():
                if test in results:
                    continue
                    
                if term.lower() in full_name.lower() or term.lower() == test.lower():
                    # Look for numbers near this term
                    term_index = text.lower().find(term.lower())
                    if term_index >= 0:
                        # Look for numbers in a 100-character window around the term
                        window_start = max(0, term_index - 50)
                        window_end = min(len(text), term_index + 100)
                        window = text[window_start:window_end]
                        numbers = re.findall(r'\d+\.?\d*', window)
                        if numbers:
                            # Use the closest number to the term
                            closest_number = None
                            min_distance = float('inf')
                            term_pos_in_window = term_index - window_start
                            
                            for num_str in numbers:
                                num_pos = window.find(num_str)
                                distance = abs(num_pos - term_pos_in_window)
                                if distance < min_distance:
                                    min_distance = distance
                                    closest_number = num_str
                            
                            if closest_number and min_distance < 50:  # Only use if within 50 chars
                                try:
                                    results[test] = float(closest_number)
                                except ValueError:
                                    pass
    
    # Look for values in tabular format
    # This often appears in blood reports where test names are in one column and values in another
    lines = text.split('\n')
    for i in range(len(lines)):
        line = lines[i]
        
        # Look for test names that might be in a table
        for test, full_name in BLOOD_TEST_CORPUS.items():
            if test in results:
                continue
                
            if re.search(fr'\b{test}\b', line, re.IGNORECASE) or re.search(fr'\b{full_name}\b', line, re.IGNORECASE):
                # Look for numbers on the same line, with preference to the right side
                numbers = re.findall(r'(\d+\.?\d*)', line)
                right_side = line[line.lower().find(test.lower()) + len(test):]
                right_numbers = re.findall(r'(\d+\.?\d*)', right_side)
                
                if right_numbers:
                    try:
                        results[test] = float(right_numbers[0])
                    except ValueError:
                        pass
                elif numbers:
                    try:
                        results[test] = float(numbers[-1])  # Take last number if multiple found
                    except ValueError:
                        pass
    
    # If hemoglobin is still missing, notify the user
    if "Hb" not in results:
        st.warning("Could not detect hemoglobin value in the report. Please check if it's present in the original document.")
    
    # If WBC is still missing, notify the user
    if "WBC" not in results:
        st.warning("Could not detect white blood cell count (WBC) in the report. Please check if it's present in the original document.")
    
    return results

def analyze_blood_results(results):
    """Analyze blood test results and generate insights"""
    insights = []
    abnormal_values = []
    
    for test, value in results.items():
        if test in NORMAL_RANGES:
            low, high, unit = NORMAL_RANGES[test]
            if value < low:
                abnormal_values.append(f"{test} ({BLOOD_TEST_CORPUS.get(test, test)}) is low: {value} {unit}")
                insights.append(f"Low {test} may indicate {get_low_indication(test)}")
            elif value > high:
                abnormal_values.append(f"{test} ({BLOOD_TEST_CORPUS.get(test, test)}) is high: {value} {unit}")
                insights.append(f"High {test} may indicate {get_high_indication(test)}")
    
    return abnormal_values, insights

def get_low_indication(test):
    """Return possible indications for low test values"""
    indications = {
        "RBC": "anemia, blood loss, nutritional deficiency, or bone marrow issues.",
        "WBC": "bone marrow problems, autoimmune disorders, or certain infections.",
        "Hb": "anemia, blood loss, nutritional deficiencies, or chronic diseases.",
        "HCT": "anemia, blood loss, or overhydration.",
        "PLT": "bone marrow problems, autoimmune conditions, or increased platelet destruction.",
        "Glucose": "hypoglycemia, which may be due to insulin excess, liver disease, or certain medications.",
        "Sodium": "overhydration, kidney problems, heart failure, or certain medications.",
        "Potassium": "kidney issues, diarrhea, vomiting, or certain medications.",
        "Albumin": "liver disease, malnutrition, or kidney problems.",
        "HDL": "increased cardiovascular risk.",
        "Iron": "iron deficiency anemia or chronic blood loss."
    }
    
    return indications.get(test, "various medical conditions")

def get_high_indication(test):
    """Return possible indications for high test values"""
    indications = {
        "RBC": "polycythemia, dehydration, or lung diseases.",
        "WBC": "infection, inflammation, stress, or certain types of cancer.",
        "Hb": "polycythemia, dehydration, or lung disease.",
        "HCT": "polycythemia, dehydration, or certain lung conditions.",
        "PLT": "infection, inflammation, or certain disorders.",
        "Glucose": "diabetes, stress, certain medications, or pancreatic issues.",
        "Creatinine": "kidney problems, muscle breakdown, or dehydration.",
        "BUN": "kidney problems, dehydration, high protein diet, or gastrointestinal bleeding.",
        "Sodium": "dehydration, diabetes insipidus, or excessive salt intake.",
        "Potassium": "kidney disease, certain medications, or cell damage.",
        "Total Bilirubin": "liver problems, bile duct obstruction, or certain types of anemia.",
        "ALT": "liver damage, hepatitis, or certain medications.",
        "AST": "liver damage, muscle injury, or heart problems.",
        "Cholesterol": "increased cardiovascular risk, genetic conditions, or poor diet.",
        "Triglycerides": "increased cardiovascular risk, diabetes, obesity, or alcohol consumption.",
        "LDL": "increased cardiovascular risk.",
        "TSH": "hypothyroidism or thyroid medication issues.",
        "CRP": "inflammation, infection, or tissue damage."
    }
    
    return indications.get(test, "various medical conditions")

def simple_text_summarization(text, num_sentences=5):
    """Provide a basic text summarization using NLTK without transformers or spaCy"""
    # Tokenize the text into sentences
    sentences = sent_tokenize(text)
    
    # If there aren't many sentences, return them all
    if len(sentences) <= num_sentences:
        return " ".join(sentences)
    
    # Calculate word frequency
    words = word_tokenize(text.lower())
    stop_words = set(stopwords.words('english'))
    filtered_words = [word for word in words if word.lower() not in stop_words 
                      and word.isalnum()]
    
    # Count word frequency
    word_frequencies = {}
    for word in filtered_words:
        if word not in word_frequencies:
            word_frequencies[word] = 1
        else:
            word_frequencies[word] += 1
    
    # Normalize frequencies
    max_frequency = max(word_frequencies.values()) if word_frequencies else 1
    for word in word_frequencies:
        word_frequencies[word] = word_frequencies[word] / max_frequency
    
    # Calculate sentence scores based on word frequencies
    sentence_scores = {}
    for i, sentence in enumerate(sentences):
        words_in_sentence = word_tokenize(sentence.lower())
        for word in words_in_sentence:
            if word in word_frequencies:
                if i not in sentence_scores:
                    sentence_scores[i] = word_frequencies[word]
                else:
                    sentence_scores[i] += word_frequencies[word]
    
    # Get top N sentences
    ranked_sentences = sorted([(score, i) for i, score in sentence_scores.items()], reverse=True)
    top_sentence_indices = [i for _, i in ranked_sentences[:num_sentences]]
    top_sentence_indices.sort()  # Keep original order
    
    summary = " ".join([sentences[i] for i in top_sentence_indices])
    return summary

def summarize_report(text, extracted_values, abnormal_values, insights):
    """Generate a comprehensive summary of the blood report"""
    # Create a basic summary using NLP if the text is long enough
    if len(text) > 1000 and TRANSFORMERS_AVAILABLE:
        try:
            # Limit text to 1000 tokens for transformer model
            summary = summarizer(text[:4000], max_length=150, min_length=50, do_sample=False)[0]['summary_text']
        except Exception as e:
            # Fallback to a basic summary if transformer fails
            st.warning(f"Using basic summarization instead of advanced NLP: {str(e)}")
            summary = simple_text_summarization(text)
    else:
        summary = simple_text_summarization(text, 3)  # Use first 3 most important sentences for short texts
    
    # Create a structured report summary
    full_summary = f"""
    ## Blood Report Summary

    {summary}
    """
    
    # Add back expanded possible indications section with improved table layout
    if insights:
        full_summary += "\n### Possible Health Implications\n"
        
        # Create simplified table headers - no custom styling for status
        full_summary += """
| Test | Status | Possible Conditions | Clinical Significance |
|------|--------|-------------------|----------------------|
"""
        
        # Process insights and group by test name
        test_insights = {}
        for insight in insights:
            # Extract the test name and status from the insight
            if insight.startswith("Low "):
                test_name = insight.split(" ")[1]
                status = "Low"
            elif insight.startswith("High "):
                test_name = insight.split(" ")[1]
                status = "High"
            else:
                continue
                
            # Add to collection, keyed by test name
            if test_name not in test_insights:
                test_insights[test_name] = []
            test_insights[test_name].append(status)
        
        # Sort test names alphabetically
        for test_name in sorted(test_insights.keys()):
            if test_name not in NORMAL_RANGES:
                continue
                
            # Process both High and Low values for this test if they exist
            for status in test_insights[test_name]:
                if status == "Low":
                    expanded_info = get_expanded_low_indication(test_name)
                else:  # High
                    expanded_info = get_expanded_high_indication(test_name)
                
                full_summary += f"| **{test_name}** ({BLOOD_TEST_CORPUS.get(test_name, test_name)}) | {status} | {expanded_info['conditions']} | {expanded_info['details']} |\n"
    
    return full_summary

def categorize_blood_tests(results):
    """Categorize blood test results into panels for better display"""
    categories = {
        "Complete Blood Count (CBC)": ["RBC", "WBC", "Hb", "HCT", "MCV", "MCH", "MCHC", "RDW", "PLT", "MPV", "PDW", "PCT"],
        "White Blood Cell Differential": ["Neutrophils", "Lymphocytes", "Monocytes", "Eosinophils", "Basophils", 
                                          "NeutrophilsAbs", "LymphocytesAbs", "MonocytesAbs", "EosinophilsAbs", 
                                          "BasophilsAbs", "Bands", "Segs"],
        "Kidney Function": ["BUN", "Creatinine", "eGFR", "BUN/Creatinine Ratio", "Uric Acid", "Cystatin C"],
        "Electrolytes": ["Sodium", "Potassium", "Chloride", "Bicarbonate", "Carbon Dioxide", "Calcium", 
                         "Ionized Calcium", "Phosphorus", "Magnesium"],
        "Liver Function": ["Total Protein", "Albumin", "Globulin", "A/G Ratio", "Total Bilirubin", 
                           "Direct Bilirubin", "Indirect Bilirubin", "Alkaline Phosphatase", "ALT", "AST", 
                           "GGT", "LDH"],
        "Lipid Panel": ["Cholesterol", "Triglycerides", "HDL", "LDL", "VLDL", "Non-HDL", "TC/HDL Ratio", 
                        "LDL/HDL Ratio", "ApoA", "ApoB", "Lp(a)"],
        "Blood Glucose": ["Glucose", "FBS", "RBS", "HbA1c", "Insulin", "HOMA-IR", "C-Peptide"],
        "Thyroid Function": ["TSH", "T3", "T4", "Free T3", "Free T4", "T3 Uptake", "Thyroglobulin", "TBG"],
        "Iron Studies": ["Iron", "TIBC", "UIBC", "Transferrin", "Transferrin Saturation", "Ferritin"],
        "Vitamins": ["Vitamin B12", "Folate", "Vitamin D", "25-OH Vitamin D", "1,25-OH Vitamin D", 
                     "Vitamin A", "Vitamin E", "Vitamin K"],
        "Inflammatory Markers": ["CRP", "hsCRP", "ESR", "Procalcitonin"],
        "Coagulation Studies": ["PT", "INR", "aPTT", "Fibrinogen", "D-dimer"],
        "Cardiac Markers": ["Troponin I", "Troponin T", "CK", "CK-MB", "BNP", "NT-proBNP", "Homocysteine"],
        "Other": []  # Will hold tests that don't fit into above categories
    }
    
    categorized_results = {}
    for category, tests in categories.items():
        category_results = {}
        for test in tests:
            # Only include tests that are actually in the extracted values
            if test in results:
                category_results[test] = results[test]
        
        # Only add the category if it has at least one test with value
        if category_results:
            categorized_results[category] = category_results
    
    # Add any remaining tests to "Other" category
    other_results = {}
    for test, value in results.items():
        if not any(test in tests for _, tests in categories.items() if _ != "Other"):
            other_results[test] = value
    
    if other_results:
        categorized_results["Other"] = other_results
    
    return categorized_results

def process_file(file_path):
    """Process a file (PDF or image) and return the analysis results"""
    # Extract text from the uploaded file
    text = ""
    if file_path.lower().endswith('.pdf'):
        if PDF_IMAGE_AVAILABLE and TESSERACT_AVAILABLE:
            text = extract_text_from_pdf(file_path)
        else:
            return {"error": "PDF processing requires pdf2image and pytesseract libraries."}
    else:
        if TESSERACT_AVAILABLE:
            image = Image.open(file_path)
            text = extract_text_from_image(image)
        else:
            return {"error": "Image processing requires pytesseract library."}
    
    if not text:
        return {"error": "Failed to extract text from the file."}
    
    # Extract blood test values
    extracted_values = extract_blood_values(text)
    
    if not extracted_values:
        return {"error": "No blood test values were detected."}
    
    # Analyze results
    abnormal_values = {}
    insights = []
    
    abnormal_values, insights = analyze_blood_results(extracted_values)
    
    # Generate summary
    summary = summarize_report(text, extracted_values, abnormal_values, insights)
    
    # Categorize blood tests by panel
    categorized_results = categorize_blood_tests(extracted_values)
    
    # Return the results as a structured object
    return {
        "extracted_values": extracted_values,
        "abnormal_values": abnormal_values,
        "insights": insights,
        "summary": summary,
        "categorized_results": categorized_results
    }

def main_cli():
    """Command-line interface for the blood report analyzer"""
    parser = argparse.ArgumentParser(description='Blood Report Analyzer')
    parser.add_argument('--file', type=str, help='Path to the blood report file (PDF or image)')
    parser.add_argument('--json', action='store_true', help='Output results as JSON')
    parser.add_argument('--output', type=str, help='Path to save output file')
    
    args = parser.parse_args()
    
    if args.file:
        # Process the file
        results = process_file(args.file)
        
        # Format abnormal values for JSON output
        if "abnormal_values" in results:
            formatted_abnormal = {}
            for test, (value, status, low, high) in results["abnormal_values"].items():
                formatted_abnormal[test] = {
                    "value": value,
                    "status": status,
                    "range": [low, high]
                }
            results["abnormal_values"] = formatted_abnormal
        
        # Output results
        if args.json:
            # Convert numpy values to Python native types for JSON serialization
            for key, value in results.get("extracted_values", {}).items():
                if isinstance(value, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64)):
                    results["extracted_values"][key] = int(value)
                elif isinstance(value, (np.float_, np.float16, np.float32, np.float64)):
                    results["extracted_values"][key] = float(value)
            
            print(json.dumps(results, indent=2))
        else:
            if "error" in results:
                print(f"Error: {results['error']}")
                sys.exit(1)
            
            print("\n=== Blood Report Analysis ===\n")
            print(f"Summary: {results['summary']}\n")
            
            print("Key Insights:")
            for insight in results["insights"]:
                print(f"- {insight}")
            
            print("\n=== Blood Test Values by Category ===\n")
            for category, tests in results["categorized_results"].items():
                print(f"\n{category} ({len(tests)} tests):")
                for test, value in tests.items():
                    print(f"  {test}: {value}")
        
        # Save output to file if requested
        if args.output:
            with open(args.output, 'w') as f:
                if args.json:
                    json.dump(results, f, indent=2)
                else:
                    f.write(f"=== Blood Report Analysis ===\n\n")
                    f.write(f"Summary: {results['summary']}\n\n")
                    
                    f.write("Key Insights:\n")
                    for insight in results["insights"]:
                        f.write(f"- {insight}\n")
                    
                    f.write("\n=== Blood Test Values by Category ===\n")
                    for category, tests in results["categorized_results"].items():
                        f.write(f"\n{category} ({len(tests)} tests):\n")
                        for test, value in tests.items():
                            f.write(f"  {test}: {value}\n")
    else:
        parser.print_help()

def main():
    st.set_page_config(page_title="Blood Report Analyzer", layout="wide")
    
    st.title("Blood Report Analyzer and Summarizer")
    st.write("Upload your blood test report (PDF or image) to get a comprehensive summary and analysis")
    
    uploaded_file = st.file_uploader("Choose a blood report file", type=["pdf", "png", "jpg", "jpeg"])
    
    text = ""
    
    if uploaded_file is not None:
        st.success(f"File uploaded: {uploaded_file.name}")
        
        # Extract text from the uploaded file
        if uploaded_file.type == "application/pdf":
            if PDF_IMAGE_AVAILABLE and TESSERACT_AVAILABLE:
                with st.spinner("Extracting text from PDF..."):
                    text = extract_text_from_pdf(uploaded_file)
            else:
                st.error("PDF processing requires pdf2image and pytesseract.")
        else:
            if TESSERACT_AVAILABLE:
                with st.spinner("Extracting text from image..."):
                    image = Image.open(uploaded_file)
                    text = extract_text_from_image(image)
            else:
                st.error("Image processing requires pytesseract.")
    
    if text:
        # Extract blood test values
        with st.spinner("Analyzing blood test results..."):
            extracted_values = extract_blood_values(text)
            
            if not extracted_values:
                st.warning("No blood test values were detected. The OCR might not have worked well with this report format.")
            else:
                st.write(f"Detected {len(extracted_values)} blood test values.")
                
                # Analyze results
                abnormal_values, insights = analyze_blood_results(extracted_values)
                
                # Generate summary
                summary = summarize_report(text, extracted_values, abnormal_values, insights)
                
                # Display summary
                st.markdown(summary)
                
                # Categorize blood tests by panel
                categorized_results = categorize_blood_tests(extracted_values)
                
                # Display values as tables by category
                st.subheader("Blood Test Values by Category")
                
                for category, category_results in categorized_results.items():
                    if category_results:
                        with st.expander(f"{category} ({len(category_results)} tests)"):
                            # Add category description
                            if category in CATEGORY_DESCRIPTIONS:
                                st.info(CATEGORY_DESCRIPTIONS[category])
                            
                            table_data = []
                            for test, value in category_results.items():
                                test_name = BLOOD_TEST_CORPUS.get(test, test)
                                if test in NORMAL_RANGES:
                                    low, high, unit = NORMAL_RANGES[test]
                                    status = "Normal"
                                    if value < low:
                                        status = "Low"
                                    elif value > high:
                                        status = "High"
                                    table_data.append({
                                        "Test": test,
                                        "Test Name": test_name,
                                        "Value": value,
                                        "Unit": unit,
                                        "Normal Range": f"{low} - {high}",
                                        "Status": status
                                    })
                                # Skip tests without normal ranges (which would result in N/A status)
                        
                            if table_data:
                                df = pd.DataFrame(table_data)
                                
                                # Create a styler object
                                styler = df.style
                                
                                # Define style functions for different statuses
                                def style_high(v):
                                    return 'color: #c62828; font-weight: bold'
                                
                                def style_low(v):
                                    return 'color: #0277bd; font-weight: bold'
                                
                                def style_normal(v):
                                    return 'color: green'
                                
                                # Apply styles based on conditions
                                styler = styler.applymap(
                                    style_high, 
                                    subset=pd.IndexSlice[df['Status'] == 'High', ['Value', 'Status']]
                                )
                                styler = styler.applymap(
                                    style_low, 
                                    subset=pd.IndexSlice[df['Status'] == 'Low', ['Value', 'Status']]
                                )
                                styler = styler.applymap(
                                    style_normal, 
                                    subset=pd.IndexSlice[df['Status'] == 'Normal', ['Value', 'Status']]
                                )
                                
                                st.dataframe(styler, use_container_width=True)
                
                # Enhance the abnormal values visualization
                abnormal_tests_data = []
                for test, value in extracted_values.items():
                    if test in NORMAL_RANGES:
                        low, high, unit = NORMAL_RANGES[test]
                        if value < low or value > high:
                            status = "Low" if value < low else "High"
                            abnormal_tests_data.append({
                                "Test Code": test,
                                "Test Name": BLOOD_TEST_CORPUS.get(test, test),
                                "Value": value,
                                "Unit": unit,
                                "Normal Range": f"{low} - {high}",
                                "Status": status,
                                "Deviation": ((value - low) / low * 100 if value < low else (value - high) / high * 100)
                            })
                
                # if abnormal_tests_data:
                #     st.subheader("Abnormal Values Visualization")
                    
                #     # ===== GRAPH CODE START =====
                #     # Sort abnormal values by deviation severity (most abnormal first)
                #     abnormal_tests_data = sorted(abnormal_tests_data, key=lambda x: abs(x['Deviation']), reverse=True)
                    
                #     # Create a figure with dynamic height based on the number of tests
                #     # Taller graph for more tests ensures adequate spacing
                #     fig_height = max(7, len(abnormal_tests_data) * 0.9)  # Minimum height of 7 inches
                #     fig, ax = plt.subplots(figsize=(10, fig_height))
                    
                #     # Extract the necessary data from the abnormal values
                #     tests = [f"{item['Test Code']}" for item in abnormal_tests_data]  # Test codes for y-axis
                #     values = [item['Value'] for item in abnormal_tests_data]  # Actual test values
                #     normal_low = [float(item['Normal Range'].split(' - ')[0]) for item in abnormal_tests_data]  # Lower bounds
                #     normal_high = [float(item['Normal Range'].split(' - ')[1]) for item in abnormal_tests_data]  # Upper bounds
                #     statuses = [item['Status'] for item in abnormal_tests_data]  # Whether values are high or low
                    
                #     # Create spaced y-positions for the bars (factor of 1.5 increases spacing between bars)
                #     y_pos = np.arange(0, len(tests) * 1.5, 1.5)  # Creates evenly spaced positions with extra room
                    
                #     # Plot the normal range background for each test
                #     # These are shown as green spans behind each bar
                #     for i, (low, high) in enumerate(zip(normal_low, normal_high)):
                #         # Calculate the vertical position and height for each normal range rectangle
                #         bar_height = 0.6  # Height of each bar
                #         y_center = y_pos[i]  # Center position of the current bar
                        
                #         # Convert the absolute y-position to a relative position (0-1 range)
                #         # This is required by matplotlib's axvspan function
                #         y_min = (y_center - bar_height/2) / (len(tests) * 1.5)
                #         y_max = (y_center + bar_height/2) / (len(tests) * 1.5)
                        
                #         # Draw a green rectangle from lower to upper bound of normal range
                #         ax.axvspan(low, high, alpha=0.2, color='green', ymin=y_min, ymax=y_max)
                    
                #     # Plot the actual test value bars
                #     # Color-coded: blue for low values, red for high values
                #     colors = ['#0277bd' if status == 'Low' else '#c62828' for status in statuses]
                #     bars = ax.barh(y_pos, values, align='center', color=colors, alpha=0.8, height=0.6)
                    
                #     # Set up the test names on the y-axis with appropriate indicators
                #     ax.set_yticks(y_pos)  # Position the labels at the bar centers
                #     y_labels = []
                #     for i, test in enumerate(tests):
                #         # Add direction indicators: ▼ for low values, ▲ for high values
                #         status_indicator = "▼" if statuses[i] == "Low" else "▲"
                #         y_labels.append(f"{status_indicator} {test}")
                #     ax.set_yticklabels(y_labels, fontsize=10)
                    
                #     # Add reference lines showing the normal range boundaries for each test
                #     for i, (low, high) in enumerate(zip(normal_low, normal_high)):
                #         # Calculate the vertical position for each line
                #         bar_height = 0.6
                #         y_center = y_pos[i]
                #         y_min = (y_center - bar_height/2) / (len(tests) * 1.5)
                #         y_max = (y_center + bar_height/2) / (len(tests) * 1.5)
                        
                #         # Draw the lower normal range boundary line
                #         ax.axvline(x=low, ymin=y_min, ymax=y_max, 
                #                   color='green', linestyle='--', alpha=0.7, linewidth=1)
                        
                #         # Draw the upper normal range boundary line
                #         ax.axvline(x=high, ymin=y_min, ymax=y_max, 
                #                   color='green', linestyle='--', alpha=0.7, linewidth=1)
                    
                #     # Add labels and title to the graph
                #     ax.set_xlabel('Value', fontsize=11)  # X-axis label
                #     ax.set_title('Abnormal Blood Test Values', fontsize=14)  # Graph title
                    
                #     # Add a legend to explain the color coding
                #     from matplotlib.patches import Patch
                #     legend_elements = [
                #         Patch(facecolor='#c62828', alpha=0.8, label='High Value'),  # Red for high
                #         Patch(facecolor='#0277bd', alpha=0.8, label='Low Value'),   # Blue for low
                #         Patch(facecolor='green', alpha=0.2, label='Normal Range')   # Green for normal range
                #     ]
                #     ax.legend(handles=legend_elements, loc='upper right', fontsize=10)
                    
                #     # Set the y-axis limits to add extra space at top and bottom
                #     y_min = min(y_pos) - 1.5  # Add space at the bottom
                #     y_max = max(y_pos) + 1.5  # Add space at the top
                #     ax.set_ylim(y_min, y_max)
                    
                #     # Invert the y-axis so tests with largest deviations appear at the top
                #     ax.invert_yaxis()
                    
                #     # Turn off the grid for a cleaner look
                #     ax.grid(False)
                    
                #     # Adjust the subplot margins for better spacing
                #     plt.subplots_adjust(left=0.2, right=0.9, top=0.9, bottom=0.1)
                    
                #     # Ensure the layout is tight and add padding around the edges
                #     plt.tight_layout(pad=2.0)
                    
                #     # Display the graph in Streamlit
                #     st.pyplot(fig)
                #     # ===== GRAPH CODE END =====
                    
                #     # Add textual explanation of the most concerning values
                #     if abnormal_tests_data:
                #         st.subheader("Most Significant Abnormal Values")
                #         significant_values = abnormal_tests_data[:min(3, len(abnormal_tests_data))]
                #         for item in significant_values:
                #             if item['Status'] == 'High':
                #                 explanation = get_expanded_high_indication(item['Test Code'])
                #                 st.markdown(f"**{item['Test Code']} ({item['Test Name']})** is high at **{item['Value']} {item['Unit']}** (normal range: {item['Normal Range']} {item['Unit']}). This may indicate {explanation['conditions']}")
                #             else:
                #                 explanation = get_expanded_low_indication(item['Test Code'])
                #                 st.markdown(f"**{item['Test Code']} ({item['Test Name']})** is low at **{item['Value']} {item['Unit']}** (normal range: {item['Normal Range']} {item['Unit']}). This may indicate {explanation['conditions']}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main_cli()
    else:
        main()  # Run the Streamlit app
