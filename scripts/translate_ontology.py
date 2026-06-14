#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Transform ontologia_veterinaria_multilingue.rdf:
  - Add xml:lang="es", "en", "pt" tagged triples for every plain-text
    datatype property value.
  - nombreAnimal / nombre: copy same value to all 3 languages.
  - Numeric / date / time properties (telefono, edad, peso, ...): skip.
"""

import re
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent
INPUT  = BASE / "public" / "ontologia" / "ontologia_veterinaria_multilingue.rdf"
OUTPUT = BASE / "public" / "ontologia" / "ontologia_veterinaria_multilingue.rdf"

# ── Translation tables ─────────────────────────────────────────────────────────
T = {}   # T[prop][es_value] = (en_value, pt_value)

T["especie"] = {
    "Conejo":   ("Rabbit",  "Coelho"),
    "Felino":   ("Feline",  "Felino"),
    "perro":    ("dog",     "cachorro"),
    "gallina":  ("hen",     "galinha"),
    "cerdo":    ("pig",     "porco"),
    "oveja":    ("sheep",   "ovelha"),
    "pez":      ("fish",    "peixe"),
    "gato":     ("cat",     "gato"),
    "conejo":   ("rabbit",  "coelho"),
    "Canino":   ("Canine",  "Canino"),
    "Pez":      ("Fish",    "Peixe"),
    "hámster":  ("hamster", "hamster"),
    "loro":     ("parrot",  "papagaio"),
    "tortuga":  ("turtle",  "tartaruga"),
    "hamster":  ("hamster", "hamster"),
}

T["raza"] = {
    "Mini Lop":         ("Mini Lop",         "Mini Lop"),
    "Persa":            ("Persian",           "Persa"),
    "Golden Retriever": ("Golden Retriever",  "Golden Retriever"),
    "Rhode Island":     ("Rhode Island",      "Rhode Island"),
    "Mini Pig":         ("Mini Pig",          "Mini Pig"),
    "Merino":           ("Merino",            "Merino"),
    "Betta":            ("Betta",             "Betta"),
    "Duroc":            ("Duroc",             "Duroc"),
    "Suffolk":          ("Suffolk",           "Suffolk"),
    "Beagle":           ("Beagle",            "Beagle"),
    "Maine Coon":       ("Maine Coon",        "Maine Coon"),
    "Pug":              ("Pug",               "Pug"),
    "Siamés":           ("Siamese",           "Siamês"),
    "Goldfish":         ("Goldfish",          "Goldfish"),
    "Labrador":         ("Labrador",          "Labrador"),
    "Sirio":            ("Syrian",            "Sírio"),
    "Amazónico":        ("Amazonian",         "Amazônico"),
    "Mediterránea":     ("Mediterranean",     "Mediterrânea"),
    "Campbell":         ("Campbell",          "Campbell"),
    "Amazona":          ("Amazon",            "Amazona"),
    "Miniatura":        ("Miniature",         "Miniatura"),
    "Corriedale":       ("Corriedale",        "Corriedale"),
    "Cocker Spaniel":   ("Cocker Spaniel",    "Cocker Spaniel"),
    "Rex":              ("Rex",               "Rex"),
    "Periquito":        ("Budgerigar",        "Periquito"),
    "Landrace":         ("Landrace",          "Landrace"),
    "Ruso enano":       ("Russian Dwarf",     "Russo-anão"),
}

T["color"] = {
    "Blanco":           ("White",             "Branco"),
    "Gris":             ("Gray",              "Cinza"),
    "Marron":           ("Brown",             "Marrom"),
    "Crema":            ("Cream",             "Creme"),
    "Negro":            ("Black",             "Preto"),
    "Blanco y Negro":   ("Black and White",   "Branco e Preto"),
    "Canela":           ("Cinnamon",          "Canela"),
    "Dorado":           ("Golden",            "Dourado"),
    "Marrón rojizo":    ("Reddish Brown",     "Marrom avermelhado"),
    "Rosado":           ("Pink",              "Rosa"),
    "Azul y rojo":      ("Blue and Red",      "Azul e vermelho"),
    "Rosado oscuro":    ("Dark Pink",         "Rosa escuro"),
    "Blanco y negro":   ("Black and White",   "Branco e preto"),
    "Tricolor":         ("Tricolor",          "Tricolor"),
    "Gris atigrado":    ("Tabby Gray",        "Cinza rajado"),
    "Azul metalico":    ("Metallic Blue",     "Azul metálico"),
    "Gris y blanco":    ("Gray and White",    "Cinza e branco"),
    "Arena":            ("Sand",              "Areia"),
    "Blanco y marrón":  ("White and Brown",   "Branco e marrom"),
    "Naranja":          ("Orange",            "Laranja"),
    "Verde y rojo":     ("Green and Red",     "Verde e vermelho"),
    "Verde oscuro":     ("Dark Green",        "Verde escuro"),
    "Gris perla":       ("Pearl Gray",        "Cinza perolado"),
    "Rosado manchas":   ("Pink with Spots",   "Rosa com manchas"),
    "Azul grisaceo":    ("Grayish Blue",      "Azul acinzentado"),
    "Verde lima":       ("Lime Green",        "Verde limão"),
    "Blanco manchas":   ("White with Spots",  "Branco com manchas"),
    "Chocolate":        ("Chocolate",         "Chocolate"),
}

T["sexo"] = {
    "Macho":  ("Male",   "Macho"),
    "Hembra": ("Female", "Fêmea"),
}

T["tipoEnfermedad"] = {
    "Bacteriana":  ("Bacterial",  "Bacteriana"),
    "Fungica":     ("Fungal",     "Fúngica"),
    "Viral":       ("Viral",      "Viral"),
    "Metabolica":  ("Metabolic",  "Metabólica"),
    "Parasitaria": ("Parasitic",  "Parasitária"),
    "Digestiva":   ("Digestive",  "Digestiva"),
}

T["tipoMedicamento"] = {
    "Antibiótico":      ("Antibiotic",         "Antibiótico"),
    "Antiparasitario":  ("Antiparasitic",      "Antiparasitário"),
    "Corticoide":       ("Corticosteroid",     "Corticoide"),
    "Diurético":        ("Diuretic",           "Diurético"),
    "Antiinflamatorio": ("Anti-inflammatory",  "Anti-inflamatório"),
    "Suplemento":       ("Supplement",         "Suplemento"),
    "Anestésico":       ("Anesthetic",         "Anestésico"),
    "Antifungico":      ("Antifungal",         "Antifúngico"),
    "Antibiotico":      ("Antibiotic",         "Antibiótico"),
    "Anticoccidial":    ("Anticoccidial",      "Anticoccidiano"),
    "Vacuna":           ("Vaccine",            "Vacina"),
    "Diuretico":        ("Diuretic",           "Diurético"),
    "Antiviral":        ("Antiviral",          "Antiviral"),
    "Soporte":          ("Supportive",         "Suporte"),
    "Antiflatulento":   ("Antiflatulent",      "Antiflatulento"),
    "Hipoglucemiante":  ("Hypoglycemic",       "Hipoglicemiante"),
    "Anticonvulsivo":   ("Anticonvulsant",     "Anticonvulsivante"),
}

T["tipoExamen"] = {
    "PCR Viral":                    ("Viral PCR",                   "PCR Viral"),
    "Hemograma":                    ("Complete Blood Count",        "Hemograma"),
    "Hisopado nasal":               ("Nasal Swab",                  "Swab nasal"),
    "Cultivo bacteriano":           ("Bacterial Culture",           "Cultura bacteriana"),
    "Radiografia toracica":         ("Chest X-ray",                 "Radiografia torácica"),
    "Electroencefalograma":         ("Electroencephalogram",        "Eletroencefalograma"),
    "Endoscopia traqueal":          ("Tracheal Endoscopy",          "Endoscopia traqueal"),
    "Radiografia mandibular":       ("Mandibular X-ray",            "Radiografia mandibular"),
    "Otoscopia y timpanometria":    ("Otoscopy and Tympanometry",   "Otoscopia e timpanometria"),
    "Electroencefalograma aviar":   ("Avian Electroencephalogram",  "Eletroencefalograma aviário"),
    "Curva de glucosa":             ("Glucose Curve",               "Curva de glicose"),
    "Serologia Brucella":           ("Brucella Serology",           "Sorologia Brucella"),
    "Percusion abdominal":          ("Abdominal Percussion",        "Percussão abdominal"),
    "Glucometria sanguinea":        ("Blood Glucometry",            "Glicometria sanguínea"),
    "Cultivo de heces":             ("Stool Culture",               "Cultura de fezes"),
    "PCR Parvovirus Porcino":       ("Porcine Parvovirus PCR",      "PCR Parvovírus Porcino"),
    "Lampara de Wood":              ("Wood's Lamp",                 "Lâmpada de Wood"),
    "Ecografía abdominal":          ("Abdominal Ultrasound",        "Ecografia abdominal"),
    "RT-PCR Influenza Aviar":       ("Avian Influenza RT-PCR",      "RT-PCR Influenza Aviária"),
    "Analisis de agua acuario":     ("Aquarium Water Analysis",     "Análise de água de aquário"),
    "Hisopado faringeo":            ("Pharyngeal Swab",             "Swab faríngeo"),
    "Examen coproparasitologico":   ("Coparasitological Exam",      "Exame coproparasitológico"),
    "Radiografía torácica":         ("Chest X-ray",                 "Radiografia torácica"),
    "Hemocultivo":                  ("Blood Culture",               "Hemocultura"),
    "Otoscopia":                    ("Otoscopy",                    "Otoscopia"),
    "Biopsia cutánea":              ("Skin Biopsy",                 "Biópsia cutânea"),
    "Raspado cutáneo":              ("Skin Scraping",               "Raspado cutâneo"),
}

T["tipoCirugia"] = {
    "Limpieza quirurgica de piel":   ("Surgical Skin Debridement",    "Limpeza cirúrgica de pele"),
    "Sutura de laceracion":          ("Laceration Suture",            "Sutura de laceração"),
    "Cesarea":                       ("Cesarean Section",             "Cesariana"),
    "Extracción de cuerpo extraño":  ("Foreign Body Removal",         "Extração de corpo estranho"),
    "Enterotomia exploratoria":      ("Exploratory Enterotomy",       "Enterotomia exploratória"),
    "Biopsia de tejido pulmonar":    ("Lung Tissue Biopsy",           "Biópsia de tecido pulmonar"),
    "Paracentesis abdominal":        ("Abdominal Paracentesis",       "Paracentese abdominal"),
    "Endoscopia digestiva":          ("Digestive Endoscopy",          "Endoscopia digestiva"),
    "Trocado ruminal":               ("Ruminal Trocar",               "Trocarte ruminal"),
    "Acceso venoso central":         ("Central Venous Access",        "Acesso venoso central"),
    "Esterilizacion":                ("Sterilization",                "Esterilização"),
    "Lavado de sacos aereos":        ("Air Sac Lavage",               "Lavagem de sacos aéreos"),
    "Extirpacion de absceso":        ("Abscess Removal",              "Extirpação de abscesso"),
    "Miringotomia":                  ("Myringotomy",                  "Miringotomia"),
    "Implante bomba de insulina":    ("Insulin Pump Implant",         "Implante de bomba de insulina"),
    "Biopsia cerebral":              ("Brain Biopsy",                 "Biópsia cerebral"),
    "Castración":                    ("Castration",                   "Castração"),
    "Esterilización (OVH)":          ("Spay (OVH)",                   "Esterilização (OVH)"),
    "Reparación de caparazón":       ("Shell Repair",                 "Reparação de carapaça"),
    "Cirugía ortopédica":            ("Orthopedic Surgery",           "Cirurgia ortopédica"),
    "Biopsia de tejido":             ("Tissue Biopsy",                "Biópsia de tecido"),
    "Extracción dental":             ("Dental Extraction",            "Extração dentária"),
    "Corrección de pico":            ("Beak Correction",              "Correção de bico"),
    "Amputación de dígito":          ("Digit Amputation",             "Amputação de dígito"),
    "Cesárea":                       ("Cesarean Section",             "Cesariana"),
}

T["tipoTratamiento"] = {
    "Antiviral":                            ("Antiviral",                              "Antiviral"),
    "Antibioticoterapia aural":             ("Aural Antibiotic Therapy",               "Antibioticoterapia auricular"),
    "Antibioticoterapia IM":                ("Intramuscular Antibiotic Therapy",       "Antibioticoterapia IM"),
    "Antibioticoterapia y soporte":         ("Antibiotic Therapy and Supportive Care", "Antibioticoterapia e suporte"),
    "Soporte IV y antiviral":               ("IV Support and Antiviral",               "Suporte IV e antiviral"),
    "Anticonvulsivo y soporte neurologico": ("Anticonvulsant and Neurological Support","Anticonvulsivo e suporte neurológico"),
    "Antifungico":                          ("Antifungal",                             "Antifúngico"),
    "Antibioticoterapia":                   ("Antibiotic Therapy",                     "Antibioticoterapia"),
    "Hipoglucemiante":                      ("Hypoglycemic Treatment",                 "Hipoglicemiante"),
    "Antiviral de soporte":                 ("Supportive Antiviral",                   "Antiviral de suporte"),
    "Corticoterapia y soporte":             ("Corticotherapy and Supportive Care",     "Corticoterapia e suporte"),
    "Antibioticoterapia y antiemetico":     ("Antibiotic Therapy and Antiemetic",      "Antibioticoterapia e antiemético"),
    "Inmunosupresor y soporte":             ("Immunosuppressant and Supportive Care",  "Imunossupressor e suporte"),
    "Inmunoestimulante y soporte":          ("Immunostimulant and Supportive Care",    "Imunoestimulante e suporte"),
    "Antibioticoterapia preventiva":        ("Preventive Antibiotic Therapy",          "Antibioticoterapia preventiva"),
    "Inmunoestimulante":                    ("Immunostimulant",                        "Imunoestimulante"),
    "Antiinflamatorio":                     ("Anti-inflammatory",                      "Anti-inflamatório"),
    "Inmunosupresor":                       ("Immunosuppressant",                      "Imunossupressor"),
    "Antiparasitario":                      ("Antiparasitic",                          "Antiparasitário"),
    "Soporte IV":                           ("IV Support",                             "Suporte IV"),
    "Antiflatulento":                       ("Antiflatulent",                          "Antiflatulento"),
    "Anticoccidial":                        ("Anticoccidial",                          "Anticoccidiano"),
    "Vacunoterapia":                        ("Vaccine Therapy",                        "Vacinoterapia"),
    "Diuretico acuatico":                   ("Aquatic Diuretic",                       "Diurético aquático"),
    "Diurético y respiratorio":             ("Diuretic and Respiratory Treatment",     "Diurético e respiratório"),
}

T["tipoVacuna"] = {
    "Polivalente Canina":     ("Canine Polyvalent",         "Polivalente Canina"),
    "Clostridiosis Ovina":    ("Ovine Clostridial",         "Clostridiose Ovina"),
    "Mixomatosis Conejo":     ("Rabbit Myxomatosis",        "Mixomatose de Coelho"),
    "Vacuna Circovirus":      ("Circovirus Vaccine",        "Vacina Circovírus"),
    "Newcastle Aviar":        ("Avian Newcastle Disease",   "Newcastle Aviária"),
    "Coccidiosis Ovina":      ("Ovine Coccidiosis",         "Coccidiose Ovina"),
    "Triple Felina":          ("Feline Triple",             "Tríplice Felina"),
    "VHD Conejo":             ("Rabbit VHD",                "DHV de Coelho"),
    "Poliomavirus Aviar":     ("Avian Polyomavirus",        "Polyomavírus Aviário"),
    "Salmonella Hamster":     ("Hamster Salmonella",        "Salmonela em Hamster"),
    "Rabia Canina":           ("Canine Rabies",             "Raiva Canina"),
    "Brucelosis Porcina":     ("Porcine Brucellosis",       "Brucelose Porcina"),
    "Leptospirosis Hamster":  ("Hamster Leptospirosis",     "Leptospirose em Hamster"),
    "Antirrábica Canina":     ("Canine Anti-Rabies",        "Antirrábica Canina"),
    "Antirrábica":            ("Anti-Rabies",               "Antirrábica"),
    "Antirrábica Felina":     ("Feline Anti-Rabies",        "Antirrábica Felina"),
    "Polivalente Parvovirus": ("Polyvalent Parvovirus",     "Polivalente Parvovírus"),
    "Erisipela Porcina":      ("Porcine Erysipelas",        "Erisipela Porcina"),
    "Neumonia Ovina":         ("Ovine Pneumonia",           "Pneumonia Ovina"),
    "Mixomatosis-VHD":        ("Myxomatosis-VHD",           "Mixomatose-DHV"),
    "Bordetella Intranasal":  ("Intranasal Bordetella",     "Bordetella Intranasal"),
    "Parvovirus Porcino":     ("Porcine Parvovirus",        "Parvovírus Porcino"),
    "Psitacosis Aviar":       ("Avian Psittacosis",         "Psitacose Aviária"),
}

T["viaAdministracion"] = {
    "Oral":          ("Oral",          "Oral"),
    "Subcutánea":    ("Subcutaneous",  "Subcutânea"),
    "Intramuscular": ("Intramuscular", "Intramuscular"),
    "Intranasal":    ("Intranasal",    "Intranasal"),
    "Acuario":       ("Aquarium",      "Aquário"),
    "Intravenosa":   ("Intravenous",   "Intravenosa"),
    "Subcutanea":    ("Subcutaneous",  "Subcutânea"),
}

T["nivelGravedad"] = {
    "Moderado": ("Moderate", "Moderado"),
    "Grave":    ("Severe",   "Grave"),
    "Leve":     ("Mild",     "Leve"),
}

T["especialidad"] = {
    "Neurologia Veterinaria":       ("Veterinary Neurology",           "Neurologia Veterinária"),
    "Cardiologia Veterinaria":      ("Veterinary Cardiology",          "Cardiologia Veterinária"),
    "Oftalmologia Veterinaria":     ("Veterinary Ophthalmology",       "Oftalmologia Veterinária"),
    "Endocrinologia Veterinaria":   ("Veterinary Endocrinology",       "Endocrinologia Veterinária"),
    "Medicina de Aves":             ("Avian Medicine",                 "Medicina de Aves"),
    "Parasitologia Veterinaria":    ("Veterinary Parasitology",        "Parasitologia Veterinária"),
    "Toxicologia Veterinaria":      ("Veterinary Toxicology",          "Toxicologia Veterinária"),
    "Cirugia Ortopedica Animal":    ("Animal Orthopedic Surgery",      "Cirurgia Ortopédica Animal"),
    "Nutrición Animal":             ("Animal Nutrition",               "Nutrição Animal"),
    "Dermatología Animal":          ("Animal Dermatology",             "Dermatologia Animal"),
    "Cardiología Animal":           ("Animal Cardiology",              "Cardiologia Animal"),
    "Oftalmología Animal":          ("Animal Ophthalmology",           "Oftalmologia Animal"),
    "Cirugía Animal":               ("Animal Surgery",                 "Cirurgia Animal"),
    "Medicina General Animal":      ("Animal General Medicine",        "Medicina Geral Animal"),
    "Medicina Interna Animal":      ("Animal Internal Medicine",       "Medicina Interna Animal"),
    "Odontología Animal":           ("Animal Dentistry",               "Odontologia Animal"),
    "Neurología Animal":            ("Animal Neurology",               "Neurologia Animal"),
    "Anestesiologia Veterinaria":   ("Veterinary Anesthesiology",      "Anestesiologia Veterinária"),
    "Infectologia Veterinaria":     ("Veterinary Infectious Disease",  "Infectologia Veterinária"),
    "Dermatologia Veterinaria":     ("Veterinary Dermatology",         "Dermatologia Veterinária"),
    "Medicina Interna Veterinaria": ("Veterinary Internal Medicine",   "Medicina Interna Veterinária"),
    "Animales Exoticos":            ("Exotic Animals",                 "Animais Exóticos"),
    "Traumatología Animal":         ("Animal Traumatology",            "Traumatologia Animal"),
    "Reproduccion Animal":          ("Animal Reproduction",            "Reprodução Animal"),
    "Oncologia Animal":             ("Animal Oncology",                "Oncologia Animal"),
}

T["nombreEnfermedad"] = {
    "Absceso Dental Conejo":    ("Rabbit Dental Abscess",      "Abscesso Dentário de Coelho"),
    "Aspergilosis Aviar":       ("Avian Aspergillosis",        "Aspergilose Aviária"),
    "Encefalitis Aviaria":      ("Avian Encephalitis",         "Encefalite Aviária"),
    "Otitis Media Canina":      ("Canine Otitis Media",        "Otite Média Canina"),
    "Moquillo Canino":          ("Canine Distemper",           "Cinomose Canina"),
    "Brucelosis Porcina":       ("Porcine Brucellosis",        "Brucelose Porcina"),
    "Diabetes Hamster":         ("Hamster Diabetes",           "Diabetes em Hamster"),
    "Parvovirus Canino":        ("Canine Parvovirus",          "Parvovirose Canina"),
    "Psitacosis":               ("Psittacosis",                "Psitacose"),
    "Sarna Sarcóptica":         ("Sarcoptic Mange",            "Sarna Sarcóptica"),
    "Leucemia Felina":          ("Feline Leukemia",            "Leucemia Felina"),
    "Otitis Externa":           ("External Otitis",            "Otite Externa"),
    "Rinitis Aviaria":          ("Avian Rhinitis",             "Rinite Aviária"),
    "Mixomatosis":              ("Myxomatosis",                "Mixomatose"),
    "Neumonia Bacteriana":      ("Bacterial Pneumonia",        "Pneumonia Bacteriana"),
    "Dermatofitosis":           ("Dermatophytosis",            "Dermatofitose"),
    "Parvovirus Porcino":       ("Porcine Parvovirus",         "Parvovírus Porcino"),
    "Erisipela Porcina":        ("Porcine Erysipelas",         "Erisipela Porcina"),
    "Hidrops en Peces":         ("Dropsy in Fish",             "Hidropisia em Peixes"),
    "Influenza Aviar":          ("Avian Influenza",            "Influenza Aviária"),
    "Coccidiosis Ovina":        ("Ovine Coccidiosis",          "Coccidiose Ovina"),
    "Traqueobronquitis Canina": ("Canine Tracheobronchitis",   "Traqueobronquite Canina"),
    "Timpanismo Ovino":         ("Ovine Bloat",                "Timpanismo Ovino"),
    "Enteritis Mucosa":         ("Mucosal Enteritis",          "Enterite Mucosal"),
    "Hipoglucemia Porcina":     ("Porcine Hypoglycemia",       "Hipoglicemia Porcina"),
}

T["nombreMedicamento"] = {
    "Amoxicilina":              ("Amoxicillin",             "Amoxicilina"),
    "Ivermectina":              ("Ivermectin",              "Ivermectina"),
    "Doxiciclina":              ("Doxycycline",             "Doxiciclina"),
    "Prednisolona":             ("Prednisolone",            "Prednisolona"),
    "Furosemida":               ("Furosemide",              "Furosemida"),
    "Penicilina G":             ("Penicillin G",            "Penicilina G"),
    "Meloxicam":                ("Meloxicam",               "Meloxicam"),
    "Enrofloxacina":            ("Enrofloxacin",            "Enrofloxacina"),
    "Vitamina C":               ("Vitamin C",               "Vitamina C"),
    "Ketamina":                 ("Ketamine",                "Cetamina"),
    "Ketoconazol":              ("Ketoconazole",            "Cetoconazol"),
    "Oxitetraciclina":          ("Oxytetracycline",         "Oxitetraciclina"),
    "Toltrazuril":              ("Toltrazuril",             "Toltrazuril"),
    "Bordetella Vacuna":        ("Bordetella Vaccine",      "Vacina Bordetella"),
    "Furosemida Acuatica":      ("Aquatic Furosemide",      "Furosemida Aquática"),
    "Oseltamivir":              ("Oseltamivir",             "Oseltamivir"),
    "Colistina":                ("Colistin",                "Colistina"),
    "Solucion Glucosada":       ("Glucose Solution",        "Solução Glicosada"),
    "Simethicona":              ("Simethicone",             "Simeticona"),
    "Ribavirin":                ("Ribavirin",               "Ribavirina"),
    "Marbofloxacino":           ("Marbofloxacin",           "Marbofloxacino"),
    "Voriconazol":              ("Voriconazole",            "Voriconazol"),
    "Insulina Glargina":        ("Insulin Glargine",        "Insulina Glargina"),
    "Interferon Canino":        ("Canine Interferon",       "Interferon Canino"),
    "Amoxicilina-Clavulanico":  ("Amoxicillin-Clavulanate","Amoxicilina-Clavulanato"),
    "Suero Fisiologico":        ("Physiological Saline",   "Soro Fisiológico"),
    "Fenobarbital":             ("Phenobarbital",           "Fenobarbital"),
    "Dexametasona":             ("Dexamethasone",           "Dexametasona"),
    "Metronidazol":             ("Metronidazole",           "Metronidazol"),
    "Vitamina C y E complejo":  ("Vitamin C and E Complex","Complexo Vitaminas C e E"),
}

T["descripcionEnfermedad"] = {
    "Infeccion purulenta en la raiz de los dientes de conejos.":
        ("Purulent infection at the root of rabbits' teeth.",
         "Infecção purulenta na raiz dos dentes de coelhos."),
    "Infeccion pulmonar por hongo Aspergillus en aves.":
        ("Pulmonary infection caused by Aspergillus fungus in birds.",
         "Infecção pulmonar pelo fungo Aspergillus em aves."),
    "Inflamacion cerebral en aves causada por enterovirus.":
        ("Brain inflammation in birds caused by enterovirus.",
         "Inflamação cerebral em aves causada por enterovírus."),
    "Infeccion del oido medio en perros, puede avanzar al interno.":
        ("Middle ear infection in dogs, can progress to the inner ear.",
         "Infecção do ouvido médio em cães, pode avançar para o interno."),
    "Enfermedad viral que afecta el sistema respiratorio y nervioso del perro.":
        ("Viral disease affecting the respiratory and nervous system of dogs.",
         "Doença viral que afeta o sistema respiratório e nervoso do cão."),
    "Infeccion por Brucella suis que afecta reproduccion en cerdos.":
        ("Infection by Brucella suis affecting reproduction in pigs.",
         "Infecção por Brucella suis que afeta a reprodução em suínos."),
    "Trastorno metabolico por exceso de glucosa en hamsters enanos.":
        ("Metabolic disorder caused by excess glucose in dwarf hamsters.",
         "Distúrbio metabólico por excesso de glicose em hamsters anões."),
    "Enfermedad viral altamente contagiosa que afecta el tracto digestivo.":
        ("Highly contagious viral disease affecting the digestive tract.",
         "Doença viral altamente contagiosa que afeta o trato digestivo."),
    "Infección bacteriana que afecta principalmente a aves como loros.":
        ("Bacterial infection that primarily affects birds such as parrots.",
         "Infecção bacteriana que afeta principalmente aves como papagaios."),
    "Infestación por ácaros que produce picazón intensa y pérdida de pelo.":
        ("Mite infestation causing intense itching and hair loss.",
         "Infestação por ácaros que causa coceira intensa e perda de pelo."),
    "Virus que afecta el sistema inmune del gato causando inmunosupresión.":
        ("Virus affecting the cat's immune system causing immunosuppression.",
         "Vírus que afeta o sistema imune do gato causando imunossupressão."),
    "Inflamación del canal auditivo externo, común en perros.":
        ("Inflammation of the external ear canal, common in dogs.",
         "Inflamação do canal auditivo externo, comum em cães."),
    "Infección respiratoria viral que afecta aves de corral.":
        ("Viral respiratory infection affecting poultry.",
         "Infecção respiratória viral que afeta aves domésticas."),
    "Enfermedad viral grave que afecta a conejos, transmitida por mosquitos.":
        ("Serious viral disease affecting rabbits, transmitted by mosquitoes.",
         "Doença viral grave que afeta coelhos, transmitida por mosquitos."),
    "Infección bacteriana pulmonar que afecta a ovinos y otros animales.":
        ("Bacterial lung infection affecting sheep and other animals.",
         "Infecção bacteriana pulmonar que afeta ovinos e outros animais."),
    "Infeccion cutanea por hongos dermatofitos, produce areas sin pelo.":
        ("Skin infection by dermatophyte fungi, causing hairless patches.",
         "Infecção cutânea por fungos dermatófitos, produz áreas sem pelo."),
    "Enfermedad viral que afecta reproduccion en cerdos.":
        ("Viral disease affecting reproduction in pigs.",
         "Doença viral que afeta a reprodução em suínos."),
    "Enfermedad bacteriana que afecta principalmente a cerdos.":
        ("Bacterial disease that primarily affects pigs.",
         "Doença bacteriana que afeta principalmente suínos."),
    "Acumulacion de fluidos abdominales por Aeromonas.":
        ("Accumulation of abdominal fluids caused by Aeromonas.",
         "Acúmulo de fluidos abdominais por Aeromonas."),
    "Enfermedad viral altamente contagiosa en aves.":
        ("Highly contagious viral disease in birds.",
         "Doença viral altamente contagiosa em aves."),
    "Infeccion intestinal por protozoos Eimeria en ovinos.":
        ("Intestinal infection by Eimeria protozoa in sheep.",
         "Infecção intestinal por protozoários Eimeria em ovinos."),
    "Infeccion del tracto respiratorio superior, conocida como tos de perrera.":
        ("Upper respiratory tract infection, known as kennel cough.",
         "Infecção do trato respiratório superior, conhecida como tosse dos canis."),
    "Acumulacion de gas en rumen de ovinos por dieta.":
        ("Accumulation of gas in the rumen of sheep due to diet.",
         "Acúmulo de gás no rúmen de ovinos por dieta."),
    "Inflamacion del intestino delgado en conejos jovenes.":
        ("Inflammation of the small intestine in young rabbits.",
         "Inflamação do intestino delgado em coelhos jovens."),
    "Nivel bajo de glucosa en cerdos recien nacidos.":
        ("Low glucose levels in newborn piglets.",
         "Nível baixo de glicose em leitões recém-nascidos."),
}

T["sintomas"] = {
    "Bulto en mandibula, salivacion excesiva, dificultad al comer":
        ("Jaw lump, excessive salivation, difficulty eating",
         "Nódulo na mandíbula, salivação excessiva, dificuldade ao comer"),
    "Dificultad respiratoria, letargo, perdida de peso":
        ("Respiratory difficulty, lethargy, weight loss",
         "Dificuldade respiratória, letargia, perda de peso"),
    "Temblores de cabeza, paralisis, perdida de equilibrio":
        ("Head tremors, paralysis, loss of balance",
         "Tremores de cabeça, paralisia, perda de equilíbrio"),
    "Sacudidas de cabeza, inclinacion, perdida de equilibrio":
        ("Head shaking, head tilt, loss of balance",
         "Sacudidas de cabeça, inclinação lateral, perda de equilíbrio"),
    "Fiebre, secrecion nasal, tos, convulsiones":
        ("Fever, nasal discharge, cough, seizures",
         "Febre, secreção nasal, tosse, convulsões"),
    "Abortos, infertilidad, artritis, fiebre intermitente":
        ("Abortions, infertility, arthritis, intermittent fever",
         "Abortos, infertilidade, artrite, febre intermitente"),
    "Exceso de sed, orina frecuente, perdida de peso, letargo":
        ("Excessive thirst, frequent urination, weight loss, lethargy",
         "Sede excessiva, urina frequente, perda de peso, letargia"),
    "Vómitos, diarrea con sangre, letargo, fiebre":
        ("Vomiting, bloody diarrhea, lethargy, fever",
         "Vômitos, diarreia com sangue, letargia, febre"),
    "Dificultad respiratoria, secreción ocular, letargo":
        ("Respiratory difficulty, ocular discharge, lethargy",
         "Dificuldade respiratória, secreção ocular, letargia"),
    "Picazón intensa, costras, pérdida de pelo":
        ("Intense itching, crusting, hair loss",
         "Coceira intensa, crostas, perda de pelo"),
    "Fiebre, secreción nasal, tos, convulsiones":
        ("Fever, nasal discharge, cough, seizures",
         "Febre, secreção nasal, tosse, convulsões"),
    "Pérdida de peso, anemia, infecciones recurrentes":
        ("Weight loss, anemia, recurring infections",
         "Perda de peso, anemia, infecções recorrentes"),
    "Rascado de orejas, mal olor, secreción oscura":
        ("Ear scratching, bad odor, dark discharge",
         "Coceira nas orelhas, mau odor, secreção escura"),
    "Estornudos, secreción nasal, ojos llorosos":
        ("Sneezing, nasal discharge, watery eyes",
         "Espirros, secreção nasal, olhos lacrimejantes"),
    "Inflamación ocular, nódulos cutáneos, fiebre alta":
        ("Eye inflammation, skin nodules, high fever",
         "Inflamação ocular, nódulos cutâneos, febre alta"),
    "Tos, fiebre, dificultad respiratoria, mucosidad nasal":
        ("Cough, fever, respiratory difficulty, nasal mucus",
         "Tosse, febre, dificuldade respiratória, muco nasal"),
    "Manchas circulares sin pelo, descamacion, picazon":
        ("Circular hairless patches, scaling, itching",
         "Manchas circulares sem pelo, descamação, coceira"),
    "Fiebre, debilidad, abortos en cerdas":
        ("Fever, weakness, abortions in sows",
         "Febre, fraqueza, abortos em porcas"),
    "Manchas rojizas en piel, fiebre, cojera":
        ("Reddish skin lesions, fever, lameness",
         "Manchas avermelhadas na pele, febre, claudicação"),
    "Abdomen distendido, escamas erizadas, letargo":
        ("Distended abdomen, raised scales, lethargy",
         "Abdome distendido, escamas eriçadas, letargia"),
    "Fiebre alta, dificultad respiratoria, diarrea verde":
        ("High fever, respiratory difficulty, green diarrhea",
         "Febre alta, dificuldade respiratória, diarreia verde"),
    "Diarrea acuosa, perdida de peso, deshidratacion":
        ("Watery diarrhea, weight loss, dehydration",
         "Diarreia aquosa, perda de peso, desidratação"),
    "Tos seca persistente, estornudos, secrecion nasal":
        ("Persistent dry cough, sneezing, nasal discharge",
         "Tosse seca persistente, espirros, secreção nasal"),
    "Abdomen izquierdo distendido, inquietud, dificultad respirar":
        ("Distended left abdomen, restlessness, difficulty breathing",
         "Abdome esquerdo distendido, inquietação, dificuldade respiratória"),
    "Diarrea mucosa, distension abdominal, anorexia":
        ("Mucous diarrhea, abdominal distension, anorexia",
         "Diarreia mucosa, distensão abdominal, anorexia"),
    "Temblores, debilidad, convulsiones, coma":
        ("Tremors, weakness, seizures, coma",
         "Tremores, fraqueza, convulsões, coma"),
}

T["sintomasReportados"] = {
    "Vómitos frecuentes y decaimiento":
        ("Frequent vomiting and general weakness",
         "Vômitos frequentes e prostração"),
    "Sacudidas de cabeza y desequilibrio al caminar":
        ("Head shaking and balance problems when walking",
         "Sacudidas de cabeça e desequilíbrio ao caminhar"),
    "Temblores y perdida de equilibrio":
        ("Tremors and loss of balance",
         "Tremores e perda de equilíbrio"),
    "Jadeo, letargo y perdida de peso notable":
        ("Panting, lethargy and significant weight loss",
         "Ofego, letargia e perda de peso notável"),
    "Bulto duro bajo la oreja y babeo constante":
        ("Hard lump under the ear and constant drooling",
         "Nódulo duro abaixo da orelha e babação constante"),
    "Temblores y debilidad extrema":
        ("Tremors and extreme weakness",
         "Tremores e fraqueza extrema"),
    "Diarrea con moco y abdomen hinchado":
        ("Mucous diarrhea and swollen abdomen",
         "Diarreia com muco e abdome inchado"),
    "Lado izquierdo abultado y agitacion":
        ("Swollen left side and agitation",
         "Lado esquerdo abaulado e agitação"),
    "Tos seca persistente al jalar la correa":
        ("Persistent dry cough when pulling on the leash",
         "Tosse seca persistente ao puxar a coleira"),
    "Diarrea acuosa y perdida de peso rapida":
        ("Watery diarrhea and rapid weight loss",
         "Diarreia aquosa e perda de peso rápida"),
    "Fiebre y secrecion nasal verde":
        ("Fever and green nasal discharge",
         "Febre e secreção nasal verde"),
    "Escamas erizadas y abdomen distendido":
        ("Raised scales and distended abdomen",
         "Escamas eriçadas e abdome distendido"),
    "Manchas en piel, fiebre y cojera":
        ("Skin lesions, fever and lameness",
         "Manchas na pele, febre e claudicação"),
    "Fiebre 40 grados y debilidad":
        ("Fever of 40 degrees and weakness",
         "Febre de 40 graus e fraqueza"),
    "Manchas redondeadas sin pelo y picazon":
        ("Round hairless patches and itching",
         "Manchas arredondadas sem pelo e coceira"),
    "Ojos hinchados y nódulos en la piel":
        ("Swollen eyes and skin nodules",
         "Olhos inchados e nódulos na pele"),
    "Sin síntomas aparentes":
        ("No apparent symptoms",
         "Sem sintomas aparentes"),
    "Estornudos frecuentes y secreción nasal":
        ("Frequent sneezing and nasal discharge",
         "Espirros frequentes e secreção nasal"),
    "Rascado frecuente de orejas y mal olor":
        ("Frequent ear scratching and bad odor",
         "Coçar frequente das orelhas e mau odor"),
    "Dificultad al respirar y secreción ocular":
        ("Difficulty breathing and eye discharge",
         "Dificuldade respiratória e secreção ocular"),
    "Pérdida de apetito y pelo opaco":
        ("Loss of appetite and dull coat",
         "Perda de apetite e pelagem opaca"),
    "Tos, fiebre y decaimiento":
        ("Cough, fever and general malaise",
         "Tosse, febre e prostração"),
    "Rascado constante y costras en la piel":
        ("Constant scratching and skin crusting",
         "Coceira constante e crostas na pele"),
    "Secrecion nasal mucopurulenta, fiebre 39.8 y conjuntivitis":
        ("Mucopurulent nasal discharge, fever 39.8 and conjunctivitis",
         "Secreção nasal mucopurulenta, febre 39,8 e conjuntivite"),
    "Tos humeda, secrecion ocular bilateral y perdida de apetito":
        ("Moist cough, bilateral eye discharge and loss of appetite",
         "Tosse úmida, secreção ocular bilateral e perda de apetite"),
    "Diarrea liquida, vomitos y temperatura de 40.5 grados":
        ("Liquid diarrhea, vomiting and temperature of 40.5 degrees",
         "Diarreia líquida, vômitos e temperatura de 40,5 graus"),
    "Tos seca, fiebre 40 grados y rechazo al alimento":
        ("Dry cough, fever of 40 degrees and refusal to eat",
         "Tosse seca, febre de 40 graus e recusa ao alimento"),
    "Estornudos frecuentes, secrecion nasal serosa y fiebre leve":
        ("Frequent sneezing, serous nasal discharge and mild fever",
         "Espirros frequentes, secreção nasal serosa e febre leve"),
    "Vomitos, secrecion ocular mucopurulenta y fiebre 41 grados":
        ("Vomiting, mucopurulent eye discharge and fever of 41 degrees",
         "Vômitos, secreção ocular mucopurulenta e febre de 41 graus"),
    "Convulsiones leves, fiebre y desorientacion":
        ("Mild seizures, fever and disorientation",
         "Convulsões leves, febre e desorientação"),
    "Fiebre alta, tos seca y falta de apetito":
        ("High fever, dry cough and loss of appetite",
         "Febre alta, tosse seca e falta de apetite"),
    "Bebe mucha agua y perdio peso en una semana":
        ("Drinking a lot of water and lost weight in one week",
         "Bebe muita água e perdeu peso em uma semana"),
    "Fiebre intermitente y articulaciones inflamadas":
        ("Intermittent fever and swollen joints",
         "Febre intermitente e articulações inflamadas"),
    "Secrecion nasal purulenta, fiebre 40 grados y letargo":
        ("Purulent nasal discharge, fever of 40 degrees and lethargy",
         "Secreção nasal purulenta, febre de 40 graus e letargia"),
    "Tos persistente, fiebre y decaimiento general":
        ("Persistent cough, fever and general malaise",
         "Tosse persistente, febre e prostração geral"),
}

T["diagnosticoInicial"] = {
    "Posible infección viral":                    ("Possible viral infection",                       "Possível infecção viral"),
    "Posible otitis media":                       ("Possible otitis media",                          "Possível otite média"),
    "Encefalitis aviaria":                        ("Avian encephalitis",                             "Encefalite aviária"),
    "Sospecha aspergilosis":                      ("Suspected aspergillosis",                        "Suspeita de aspergilose"),
    "Absceso dental":                             ("Dental abscess",                                 "Abscesso dentário"),
    "Hipoglucemia porcina":                       ("Porcine hypoglycemia",                           "Hipoglicemia porcina"),
    "Enteritis mucosa":                           ("Mucosal enteritis",                              "Enterite mucosal"),
    "Timpanismo ovino":                           ("Ovine bloat",                                    "Timpanismo ovino"),
    "Traqueobronquitis canina":                   ("Canine tracheobronchitis",                       "Traqueobronquite canina"),
    "Coccidiosis ovina":                          ("Ovine coccidiosis",                              "Coccidiose ovina"),
    "Posible influenza aviar":                    ("Possible avian influenza",                       "Possível influenza aviária"),
    "Hidrops bacteriano":                         ("Bacterial dropsy",                               "Hidropisia bacteriana"),
    "Erisipela porcina":                          ("Porcine erysipelas",                             "Erisipela porcina"),
    "Sospecha parvovirus porcino":                ("Suspected porcine parvovirus",                   "Suspeita de parvovírus porcino"),
    "Posible dermatofitosis":                     ("Possible dermatophytosis",                       "Possível dermatofitose"),
    "Sospecha de mixomatosis":                    ("Suspected myxomatosis",                          "Suspeita de mixomatose"),
    "Saludable, control de rutina":               ("Healthy, routine check-up",                      "Saudável, controle de rotina"),
    "Rinitis aviaria leve":                       ("Mild avian rhinitis",                            "Rinite aviária leve"),
    "Otitis externa leve":                        ("Mild external otitis",                           "Otite externa leve"),
    "Posible psitacosis":                         ("Possible psittacosis",                           "Possível psitacose"),
    "Sospecha de leucemia felina":                ("Suspected feline leukemia",                      "Suspeita de leucemia felina"),
    "Moquillo canino":                            ("Canine distemper",                               "Cinomose canina"),
    "Sarna sarcóptica":                           ("Sarcoptic mange",                                "Sarna sarcóptica"),
    "Moquillo canino forma digestiva":            ("Canine distemper - digestive form",              "Cinomose canina forma digestiva"),
    "Moquillo canino con afeccion neurologica":   ("Canine distemper with neurological involvement", "Cinomose canina com comprometimento neurológico"),
    "Diabetes hamster":                           ("Hamster diabetes",                               "Diabetes em hamster"),
    "Posible brucelosis porcina":                 ("Possible porcine brucellosis",                   "Possível brucelose porcina"),
}

T["indicaciones"] = {
    "Ribavirin oral cada 12 horas por 10 dias con soporte":
        ("Ribavirin orally every 12 hours for 10 days with supportive care",
         "Ribavirina oral a cada 12 horas por 10 dias com suporte"),
    "Marbofloxacino oral 1 vez al dia 14 dias mas gotas auditivas":
        ("Marbofloxacin orally once daily for 14 days plus ear drops",
         "Marbofloxacino oral 1 vez ao dia por 14 dias mais gotas auriculares"),
    "Penicilina G IM cada 48 horas 7 dias con limpieza de absceso":
        ("Penicillin G IM every 48 hours for 7 days with abscess cleaning",
         "Penicilina G IM a cada 48 horas por 7 dias com limpeza do abscesso"),
    "Amoxicilina-clavulanico cada 12 horas con alimento, reposo absoluto":
        ("Amoxicillin-clavulanate every 12 hours with food, complete rest",
         "Amoxicilina-clavulanato a cada 12 horas com alimento, repouso absoluto"),
    "Suero fisiologico IV cada 8 horas, control de temperatura cada 6 horas":
        ("Physiological saline IV every 8 hours, temperature check every 6 hours",
         "Soro fisiológico IV a cada 8 horas, controle de temperatura a cada 6 horas"),
    "Fenobarbital oral cada 12 horas, control neurologico semanal":
        ("Phenobarbital orally every 12 hours, weekly neurological follow-up",
         "Fenobarbital oral a cada 12 horas, controle neurológico semanal"),
    "Voriconazol oral 2 veces al dia durante 21 dias con control semanal":
        ("Voriconazole orally twice daily for 21 days with weekly monitoring",
         "Voriconazol oral 2 vezes ao dia por 21 dias com controle semanal"),
    "Doxiciclina oral 100mg al dia por 30 dias y cuarentena del animal":
        ("Doxycycline orally 100 mg per day for 30 days and animal quarantine",
         "Doxiciclina oral 100 mg ao dia por 30 dias e quarentena do animal"),
    "Insulina glargina subcutanea 1 UI cada 12h con dieta controlada":
        ("Insulin glargine subcutaneous 1 IU every 12 h with controlled diet",
         "Insulina glargina subcutânea 1 UI a cada 12h com dieta controlada"),
    "Reposo, hidratacion y suplemento vitaminico diario":
        ("Rest, hydration and daily vitamin supplement",
         "Repouso, hidratação e suplemento vitamínico diário"),
    "Dexametasona IM cada 24 horas por 5 dias, luego reduccion gradual":
        ("Dexamethasone IM every 24 hours for 5 days, then gradual tapering",
         "Dexametasona IM a cada 24 horas por 5 dias, depois redução gradual"),
    "Metronidazol oral cada 12 horas 10 dias, dieta blanda":
        ("Metronidazole orally every 12 hours for 10 days, soft diet",
         "Metronidazol oral a cada 12 horas por 10 dias, dieta branda"),
    "Prednisolona oral cada 24 horas con reduccion gradual, hidratacion oral":
        ("Prednisolone orally every 24 hours with gradual tapering, oral hydration",
         "Prednisolona oral a cada 24 horas com redução gradual, hidratação oral"),
    "Vitaminas C y E orales cada 24 horas, reposo e hidratacion abundante":
        ("Vitamins C and E orally every 24 hours, rest and plenty of fluids",
         "Vitaminas C e E oral a cada 24 horas, repouso e hidratação abundante"),
    "Enrofloxacina oral cada 24 horas para prevenir sobreinfeccion bacteriana":
        ("Enrofloxacin orally every 24 hours to prevent bacterial superinfection",
         "Enrofloxacina oral a cada 24 horas para prevenir sobreinfecção bacteriana"),
    "Amoxicilina oral cada 8 horas 14 dias, colirio ocular cada 6 horas":
        ("Amoxicillin orally every 8 hours for 14 days, eye drops every 6 hours",
         "Amoxicilina oral a cada 8 horas por 14 dias, colírio ocular a cada 6 horas"),
    "Reposo, hidratación y suplemento vitamínico diario":
        ("Rest, hydration and daily vitamin supplement",
         "Repouso, hidratação e suplemento vitamínico diário"),
    "Vitamina C oral dos veces al día con agua":
        ("Vitamin C orally twice daily with water",
         "Vitamina C oral duas vezes ao dia com água"),
    "Meloxicam una vez al día, no superar dosis indicada":
        ("Meloxicam once daily, do not exceed the prescribed dose",
         "Meloxicam uma vez ao dia, não superar a dose indicada"),
    "Enrofloxacina en agua de bebida durante 10 días":
        ("Enrofloxacin in drinking water for 10 days",
         "Enrofloxacina na água de beber por 10 dias"),
    "Administrar 1 tableta cada 12 horas con alimento":
        ("Give 1 tablet every 12 hours with food",
         "Administrar 1 comprimido a cada 12 horas com alimento"),
    "Administrar Prednisolona cada 24 horas con alimento":
        ("Give Prednisolone every 24 hours with food",
         "Administrar Prednisolona a cada 24 horas com alimento"),
    "Doxiciclina dos veces al día, mezclar con alimento":
        ("Doxycycline twice daily, mix with food",
         "Doxiciclina duas vezes ao dia, misturar com alimento"),
    "Aplicar ivermectina subcutánea una vez por semana":
        ("Apply ivermectin subcutaneously once a week",
         "Aplicar ivermectina subcutânea uma vez por semana"),
    "Penicilina G intramuscular cada 24 horas por 7 días":
        ("Penicillin G intramuscularly every 24 hours for 7 days",
         "Penicilina G intramuscular a cada 24 horas por 7 dias"),
    "Ketoconazol 1 comprimido al dia 30 dias con comida":
        ("Ketoconazole 1 tablet per day for 30 days with food",
         "Cetoconazol 1 comprimido ao dia por 30 dias com comida"),
    "Oseltamivir oral 2 veces al dia por 5 dias":
        ("Oseltamivir orally twice daily for 5 days",
         "Oseltamivir oral 2 vezes ao dia por 5 dias"),
    "Colistina oral disuelta en agua 7 dias":
        ("Colistin orally dissolved in water for 7 days",
         "Colistina oral dissolvida em água por 7 dias"),
    "Suero glucosado IV cada 8 horas durante 3 dias":
        ("Glucose IV saline every 8 hours for 3 days",
         "Soro glicosado IV a cada 8 horas por 3 dias"),
    "Simethicona oral dosis unica y trocar si no mejora en 2h":
        ("Simethicone orally single dose and trocar if no improvement in 2 h",
         "Simeticona oral dose única e trocarte se não melhorar em 2h"),
    "Oxitetraciclina IM cada 48 horas 7 dias":
        ("Oxytetracycline IM every 48 hours for 7 days",
         "Oxitetraciclina IM a cada 48 horas por 7 dias"),
    "Toltrazuril oral dosis unica repetir en 3 semanas":
        ("Toltrazuril orally single dose, repeat in 3 weeks",
         "Toltrazuril oral dose única, repetir em 3 semanas"),
    "Aplicar vacuna intranasal y reposo sin corrientes de aire":
        ("Apply intranasal vaccine and rest away from drafts",
         "Aplicar vacina intranasal e repouso sem correntes de ar"),
    "Furosemida en agua del acuario cambio 25% agua cada 2 dias":
        ("Furosemide in aquarium water, 25% water change every 2 days",
         "Furosemida na água do aquário, troca de 25% da água a cada 2 dias"),
    "Furosemida intramuscular cada 12 horas, control diario":
        ("Furosemide intramuscularly every 12 hours, daily monitoring",
         "Furosemida intramuscular a cada 12 horas, controle diário"),
}

T["resultado"] = {
    "Positivo para virus del moquillo canino en hisopado conjuntival":
        ("Positive for canine distemper virus on conjunctival swab",
         "Positivo para vírus da cinomose canina em swab conjuntival"),
    "Linfopenia marcada y neutrofilia, patron viral agudo":
        ("Marked lymphopenia and neutrophilia, acute viral pattern",
         "Linfopenia marcada e neutrofilia, padrão viral agudo"),
    "Presencia de virus moquillo canino en secrecion nasal":
        ("Presence of canine distemper virus in nasal discharge",
         "Presença do vírus da cinomose canina na secreção nasal"),
    "Positivo para virus del moquillo canino, forma gastrointestinal":
        ("Positive for canine distemper virus, gastrointestinal form",
         "Positivo para vírus da cinomose canina, forma gastrointestinal"),
    "Negativo para bacteria, confirmado origen viral por exclusion":
        ("Negative for bacteria, viral origin confirmed by exclusion",
         "Negativo para bactéria, origem viral confirmada por exclusão"),
    "Patron intersticial difuso, neumonitis viral compatible con moquillo":
        ("Diffuse interstitial pattern, viral pneumonitis compatible with distemper",
         "Padrão intersticial difuso, pneumonite viral compatível com cinomose"),
    "Actividad epileptica focal, compatible con moquillo neurologico":
        ("Focal epileptic activity, compatible with neurological distemper",
         "Atividade epiléptica focal, compatível com cinomose neurológica"),
    "Positivo para virus del moquillo canino cepa respiratoria":
        ("Positive for canine distemper virus, respiratory strain",
         "Positivo para vírus da cinomose canina cepa respiratória"),
    "Placas miceliales en trachea y sacos aereos, Aspergillus positivo":
        ("Mycelial plaques in trachea and air sacs, Aspergillus positive",
         "Placas miceliais em traqueia e sacos aéreos, Aspergillus positivo"),
    "Absceso periapical en molar inferior izquierdo confirmado":
        ("Periapical abscess in lower left molar confirmed",
         "Abscesso periapical no molar inferior esquerdo confirmado"),
    "Membrana timpanica perforada, presencia de exudado purulento":
        ("Perforated tympanic membrane, presence of purulent exudate",
         "Membrana timpânica perfurada, presença de exsudato purulento"),
    "Actividad epileptica difusa en ambos hemisferios":
        ("Diffuse epileptic activity in both hemispheres",
         "Atividade epiléptica difusa em ambos os hemisférios"),
    "Leucocitosis marcada, compatible con infeccion viral activa":
        ("Marked leukocytosis, compatible with active viral infection",
         "Leucocitose marcada, compatível com infecção viral ativa"),
    "Positivo para virus del moquillo canino":
        ("Positive for canine distemper virus",
         "Positivo para vírus da cinomose canina"),
    "Glucosa en ayunas 320 mg/dL, diabetes mellitus confirmada":
        ("Fasting glucose 320 mg/dL, diabetes mellitus confirmed",
         "Glicose em jejum 320 mg/dL, diabetes mellitus confirmada"),
    "Rosa de Bengala positivo, confirmado Brucella suis en suero":
        ("Rose Bengal positive, Brucella suis confirmed in serum",
         "Rosa de Bengala positivo, Brucella suis confirmada no soro"),
    "Sonido timpanico en cuadrante izquierdo":
        ("Tympanic sound in left quadrant",
         "Som timpânico no quadrante esquerdo"),
    "Glucosa 28 mg/dL, hipoglucemia severa":
        ("Glucose 28 mg/dL, severe hypoglycemia",
         "Glicose 28 mg/dL, hipoglicemia grave"),
    "Clostridium spiroforme positivo":
        ("Clostridium spiroforme positive",
         "Clostridium spiroforme positivo"),
    "Positivo para Parvovirus porcino tipo 1":
        ("Positive for Porcine Parvovirus type 1",
         "Positivo para Parvovírus Porcino tipo 1"),
    "Fluorescencia verde positiva, confirma dermatofitosis":
        ("Positive green fluorescence, confirms dermatophytosis",
         "Fluorescência verde positiva, confirma dermatofitose"),
    "Sin alteraciones visibles en órganos internos":
        ("No visible abnormalities in internal organs",
         "Sem alterações visíveis nos órgãos internos"),
    "Positivo H5N1 confirmado en hisopado":
        ("H5N1 positive confirmed on swab",
         "H5N1 positivo confirmado em swab"),
    "Amoniaco 4.2 ppm y Aeromonas hydrophila detectada":
        ("Ammonia 4.2 ppm and Aeromonas hydrophila detected",
         "Amônia 4,2 ppm e Aeromonas hydrophila detectada"),
    "Bordetella bronchiseptica positivo en cultivo":
        ("Bordetella bronchiseptica positive on culture",
         "Bordetella bronchiseptica positivo em cultura"),
    "Ooquistes de Eimeria ovina confirmados":
        ("Ovine Eimeria oocysts confirmed",
         "Oocistos de Eimeria ovina confirmados"),
    "Consolidación pulmonar en lóbulo craneal":
        ("Pulmonary consolidation in cranial lobe",
         "Consolidação pulmonar no lóbulo cranial"),
    "Erysipelothrix rhusiopathiae positivo":
        ("Erysipelothrix rhusiopathiae positive",
         "Erysipelothrix rhusiopathiae positivo"),
    "Presencia de virus respiratorio aviar":
        ("Presence of avian respiratory virus",
         "Presença de vírus respiratório aviário"),
    "Inflamación y secreción en canal auditivo":
        ("Inflammation and discharge in ear canal",
         "Inflamação e secreção no canal auditivo"),
    "Anemia leve, glóbulos blancos elevados":
        ("Mild anemia, elevated white blood cells",
         "Anemia leve, glóbulos brancos elevados"),
    "Nódulos compatibles con mixomatosis":
        ("Nodules compatible with myxomatosis",
         "Nódulos compatíveis com mixomatose"),
    "Presencia de ácaros Sarcoptes scabiei":
        ("Presence of Sarcoptes scabiei mites",
         "Presença de ácaros Sarcoptes scabiei"),
    "Chlamydia psittaci positivo":
        ("Chlamydia psittaci positive",
         "Chlamydia psittaci positivo"),
}

T["descripcionServicio"] = {
    "Vacunacion anual perro Labrador Bruno":
        ("Annual vaccination for Labrador dog Bruno",
         "Vacinação anual do cão Labrador Bruno"),
    "Vacuna preventiva clostridiosis oveja Woolly":
        ("Preventive clostridial vaccine for sheep Woolly",
         "Vacina preventiva de clostridiose para ovelha Woolly"),
    "Vacuna preventiva conejo Angora Tobias":
        ("Preventive vaccine for Angora rabbit Tobias",
         "Vacina preventiva para coelho Angorá Tobias"),
    "Vacuna preventiva circovirus cerdita Piggy":
        ("Preventive circovirus vaccine for piglet Piggy",
         "Vacina preventiva contra circovírus para leitoa Piggy"),
    "Vacunacion anual perro Beagle Buddy":
        ("Annual vaccination for Beagle dog Buddy",
         "Vacinação anual do cão Beagle Buddy"),
    "Vacuna preventiva Newcastle loro Amazona":
        ("Preventive Newcastle vaccine for parrot Amazona",
         "Vacina preventiva Newcastle para papagaio Amazona"),
    "Vacunacion preventiva oveja Suffolk Lanita":
        ("Preventive vaccination for Suffolk sheep Lanita",
         "Vacinação preventiva para ovelha Suffolk Lanita"),
    "Refuerzo vacuna triple gata Maine Coon Kira":
        ("Triple vaccine booster for Maine Coon cat Kira",
         "Reforço da vacina tríplice para gata Maine Coon Kira"),
    "Vacuna enfermedad hemorragica viral conejo Rex":
        ("Viral hemorrhagic disease vaccine for rabbit Rex",
         "Vacina contra doença hemorrágica viral para coelho Rex"),
    "Vacuna poliomavirus periquito Kiwi":
        ("Polyomavirus vaccine for budgerigar Kiwi",
         "Vacina polyomavírus para periquito Kiwi"),
    "Vacuna preventiva salmonella hamster Nugget":
        ("Preventive salmonella vaccine for hamster Nugget",
         "Vacina preventiva de salmonela para hamster Nugget"),
    "Vacuna antirabica anual perra Cocker Canela":
        ("Annual rabies vaccine for Cocker Spaniel female Canela",
         "Vacina antirrábica anual para cadela Cocker Spaniel Canela"),
    "Primera dosis vacuna cachorro Labrador Duke":
        ("First vaccine dose for Labrador puppy Duke",
         "Primeira dose da vacina para filhote Labrador Duke"),
    "Vacunacion anual perra Labrador Lola":
        ("Annual vaccination for female Labrador Lola",
         "Vacinação anual da cadela Labrador Lola"),
    "Vacunacion anual perro Labrador Rex":
        ("Annual vaccination for Labrador dog Rex",
         "Vacinação anual do cão Labrador Rex"),
    "Vacunacion preventiva perra Labrador Bella":
        ("Preventive vaccination for female Labrador Bella",
         "Vacinação preventiva para cadela Labrador Bella"),
    "Vacuna brucelosis cerdo Landrace Manchas":
        ("Brucellosis vaccine for Landrace pig Manchas",
         "Vacina de brucelose para porco Landrace Manchas"),
    "Vacuna leptospirosis hamster ruso Pelusa":
        ("Leptospirosis vaccine for Russian hamster Pelusa",
         "Vacina de leptospirose para hamster russo Pelusa"),
    "Vacunacion anual perro Labrador Coco":
        ("Annual vaccination for Labrador dog Coco",
         "Vacinação anual do cão Labrador Coco"),
    "Primera dosis vacuna cachorra Labrador Sasha":
        ("First vaccine dose for female Labrador puppy Sasha",
         "Primeira dose da vacina para filhote fêmea Labrador Sasha"),
    "Vacunacion preventiva perra Labrador Nala":
        ("Preventive vaccination for female Labrador Nala",
         "Vacinação preventiva para cadela Labrador Nala"),
    "Vacuna antirabica perro Labrador Simba":
        ("Rabies vaccine for Labrador dog Simba",
         "Vacina antirrábica para cão Labrador Simba"),
    "Vacunacion anual perro Labrador Titan":
        ("Annual vaccination for Labrador dog Titan",
         "Vacinação anual do cão Labrador Titan"),
    "Vacuna antirrábica gato Siamés":
        ("Anti-rabies vaccine for Siamese cat",
         "Vacina antirrábica para gato Siamês"),
    "Vacuna polivalente perro Pug":
        ("Polyvalent vaccine for Pug dog",
         "Vacina polivalente para cão Pug"),
    "Vacuna preventiva para cerdo Mini Pig":
        ("Preventive vaccine for Mini Pig",
         "Vacina preventiva para Mini Pig"),
    "Vacunación preventiva oveja Merino":
        ("Preventive vaccination for Merino sheep",
         "Vacinação preventiva para ovelha Merino"),
    "Vacunación preventiva para conejo Mini Lop":
        ("Preventive vaccination for Mini Lop rabbit",
         "Vacinação preventiva para coelho Mini Lop"),
    "Vacuna contra Newcastle en gallina":
        ("Newcastle disease vaccine for hen",
         "Vacina contra Newcastle em galinha"),
    "Vacunación anual perro Golden Retriever":
        ("Annual vaccination for Golden Retriever dog",
         "Vacinação anual do cão Golden Retriever"),
    "Vacuna triple felina gato Persa":
        ("Feline triple vaccine for Persian cat",
         "Vacina tríplice felina para gato Persa"),
    "Vacuna preventiva tos de perrera Beagle":
        ("Preventive kennel cough vaccine for Beagle",
         "Vacina preventiva de tosse dos canis para Beagle"),
    "Vacunacion preventiva cerdo Duroc Porky":
        ("Preventive vaccination for Duroc pig Porky",
         "Vacinação preventiva para porco Duroc Porky"),
    "Vacuna preventiva loro Amazónico":
        ("Preventive vaccine for Amazonian parrot",
         "Vacina preventiva para papagaio Amazônico"),
    "Tratamiento encefalitis aviaria loro Amazona":
        ("Avian encephalitis treatment for parrot Amazona",
         "Tratamento de encefalite aviária para papagaio Amazona"),
    "Tratamiento otitis media perra Cocker Canela":
        ("Otitis media treatment for Cocker Spaniel female Canela",
         "Tratamento de otite média para cadela Cocker Spaniel Canela"),
    "Tratamiento absceso dental conejo Rex Pitufo":
        ("Dental abscess treatment for rabbit Rex Pitufo",
         "Tratamento de abscesso dentário para coelho Rex Pitufo"),
    "Tratamiento moquillo canino perra Labrador Bella":
        ("Canine distemper treatment for female Labrador Bella",
         "Tratamento de cinomose canina para cadela Labrador Bella"),
    "Tratamiento intensivo moquillo cachorro Labrador Duke":
        ("Intensive distemper treatment for Labrador puppy Duke",
         "Tratamento intensivo de cinomose para filhote Labrador Duke"),
    "Tratamiento neurologico moquillo perra Labrador Lola":
        ("Neurological distemper treatment for female Labrador Lola",
         "Tratamento neurológico de cinomose para cadela Labrador Lola"),
    "Tratamiento aspergilosis periquito Kiwi":
        ("Aspergillosis treatment for budgerigar Kiwi",
         "Tratamento de aspergilose para periquito Kiwi"),
    "Tratamiento brucelosis porcina Manchas":
        ("Porcine brucellosis treatment for Manchas",
         "Tratamento de brucelose porcina para Manchas"),
    "Tratamiento diabetes hamster Pelusa":
        ("Diabetes treatment for hamster Pelusa",
         "Tratamento de diabetes para hamster Pelusa"),
    "Tratamiento de soporte para moquillo en perro Labrador Rex":
        ("Supportive treatment for distemper in Labrador dog Rex",
         "Tratamento de suporte para cinomose em cão Labrador Rex"),
    "Tratamiento moquillo canino perro Labrador Titan":
        ("Canine distemper treatment for Labrador dog Titan",
         "Tratamento de cinomose canina para cão Labrador Titan"),
    "Tratamiento moquillo digestivo perra Labrador Nala":
        ("Digestive distemper treatment for female Labrador Nala",
         "Tratamento de cinomose digestiva para cadela Labrador Nala"),
    "Tratamiento moquillo perro Labrador Simba":
        ("Distemper treatment for Labrador dog Simba",
         "Tratamento de cinomose para cão Labrador Simba"),
    "Tratamiento soporte moquillo perro Labrador Coco":
        ("Supportive distemper treatment for Labrador dog Coco",
         "Tratamento de suporte de cinomose para cão Labrador Coco"),
    "Tratamiento moquillo cachorra Labrador Sasha":
        ("Distemper treatment for female Labrador puppy Sasha",
         "Tratamento de cinomose para filhote fêmea Labrador Sasha"),
    "Tratamiento moquillo canino perro Labrador Bruno":
        ("Canine distemper treatment for Labrador dog Bruno",
         "Tratamento de cinomose canina para cão Labrador Bruno"),
    "Consulta de revisión general":
        ("General check-up consultation",
         "Consulta de revisão geral"),
    "Tratamiento de soporte para moquillo canino":
        ("Supportive treatment for canine distemper",
         "Tratamento de suporte para cinomose canina"),
    "Tratamiento de soporte para mixomatosis en conejo":
        ("Supportive treatment for myxomatosis in rabbit",
         "Tratamento de suporte para mixomatose em coelho"),
    "Tratamiento antiinflamatorio para otitis en perro Labrador":
        ("Anti-inflammatory treatment for otitis in Labrador dog",
         "Tratamento anti-inflamatório para otite em cão Labrador"),
    "Tratamiento antibiótico para rinitis en gallina":
        ("Antibiotic treatment for rhinitis in hen",
         "Tratamento antibiótico para rinite em galinha"),
    "Tratamiento para leucemia felina":
        ("Treatment for feline leukemia",
         "Tratamento para leucemia felina"),
    "Tratamiento antibiótico para psitacosis en loro":
        ("Antibiotic treatment for psittacosis in parrot",
         "Tratamento antibiótico para psitacose em papagaio"),
    "Tratamiento antiparasitario para sarna en hámster":
        ("Antiparasitic treatment for mange in hamster",
         "Tratamento antiparasitário para sarna em hamster"),
    "Tratamiento antibiótico para erisipela en cerdo":
        ("Antibiotic treatment for erysipelas in pig",
         "Tratamento antibiótico para erisipela em porco"),
    "Tratamiento dermatofitosis gata Maine Coon":
        ("Dermatophytosis treatment for Maine Coon cat",
         "Tratamento de dermatofitose para gata Maine Coon"),
    "Tratamiento influenza aviar loro":
        ("Avian influenza treatment for parrot",
         "Tratamento de influenza aviária para papagaio"),
    "Tratamiento enteritis mucosa conejo":
        ("Mucosal enteritis treatment for rabbit",
         "Tratamento de enterite mucosal para coelho"),
    "Tratamiento hipoglucemia cerdita Piggy":
        ("Hypoglycemia treatment for piglet Piggy",
         "Tratamento de hipoglicemia para leitoa Piggy"),
    "Tratamiento timpanismo oveja Woolly":
        ("Bloat treatment for sheep Woolly",
         "Tratamento de timpanismo para ovelha Woolly"),
    "Tratamiento parvovirus porcino cerdo Duroc":
        ("Porcine parvovirus treatment for Duroc pig",
         "Tratamento de parvovírus porcino para porco Duroc"),
    "Tratamiento coccidiosis ovina Suffolk":
        ("Ovine coccidiosis treatment for Suffolk sheep",
         "Tratamento de coccidiose ovina para Suffolk"),
    "Tratamiento traqueobronquitis perro Beagle":
        ("Tracheobronchitis treatment for Beagle dog",
         "Tratamento de traqueobronquite para cão Beagle"),
    "Tratamiento hidrops bacteriano pez Betta Azul":
        ("Bacterial dropsy treatment for Blue Betta fish",
         "Tratamento de hidropisia bacteriana para peixe Betta Azul"),
    "Tratamiento respiratorio para neumonía en oveja":
        ("Respiratory treatment for pneumonia in sheep",
         "Tratamento respiratório para pneumonia em ovelha"),
    "Consulta perra Cocker con inclinacion de cabeza":
        ("Consultation for Cocker Spaniel female with head tilt",
         "Consulta de cadela Cocker com inclinação de cabeça"),
    "Consulta loro con temblores de cabeza":
        ("Consultation for parrot with head tremors",
         "Consulta de papagaio com tremores de cabeça"),
    "Consulta periquito con dificultad respiratoria":
        ("Consultation for budgerigar with respiratory difficulty",
         "Consulta de periquito com dificuldade respiratória"),
    "Consulta conejo Rex con bulto en mandibula":
        ("Consultation for Rex rabbit with jaw lump",
         "Consulta de coelho Rex com nódulo na mandíbula"),
    "Consulta cerdita con temblores":
        ("Consultation for piglet with tremors",
         "Consulta de leitoa com tremores"),
    "Consulta conejo con diarrea mucosa":
        ("Consultation for rabbit with mucous diarrhea",
         "Consulta de coelho com diarreia mucosa"),
    "Consulta oveja con abdomen muy distendido":
        ("Consultation for sheep with very distended abdomen",
         "Consulta de ovelha com abdome muito distendido"),
    "Consulta tos perro Beagle":
        ("Consultation for Beagle dog with cough",
         "Consulta de cão Beagle com tosse"),
    "Consulta diarrea oveja Suffolk":
        ("Consultation for Suffolk sheep with diarrhea",
         "Consulta de ovelha Suffolk com diarreia"),
    "Consulta loro con dificultad respiratoria":
        ("Consultation for parrot with respiratory difficulty",
         "Consulta de papagaio com dificuldade respiratória"),
    "Urgencia abdomen hinchado pez Betta":
        ("Emergency for Betta fish with swollen abdomen",
         "Urgência por abdome inchado no peixe Betta"),
    "Consulta por manchas rojizas en cerdo":
        ("Consultation for pig with reddish skin lesions",
         "Consulta por manchas avermelhadas em porco"),
    "Revision cerdo Duroc por fiebre":
        ("Examination of Duroc pig for fever",
         "Revisão do porco Duroc por febre"),
    "Consulta manchas piel gata Maine Coon":
        ("Consultation for Maine Coon cat with skin patches",
         "Consulta de gata Maine Coon com manchas na pele"),
    "Consulta por inflamación ocular en conejo":
        ("Consultation for rabbit with eye inflammation",
         "Consulta por inflamação ocular em coelho"),
    "Revisión general de tortuga":
        ("General check-up for turtle",
         "Revisão geral de tartaruga"),
    "Consulta por estornudos en gallina":
        ("Consultation for hen with sneezing",
         "Consulta por espirros em galinha"),
    "Control de orejas en perro Labrador":
        ("Ear check-up for Labrador dog",
         "Controle de orelhas em cão Labrador"),
    "Chequeo por problemas respiratorios en loro":
        ("Check-up for respiratory problems in parrot",
         "Exame por problemas respiratórios em papagaio"),
    "Revisión por decaimiento general del gato":
        ("Examination for general malaise in cat",
         "Revisão por prostração geral do gato"),
    "Consulta por tos persistente en perro":
        ("Consultation for dog with persistent cough",
         "Consulta por tosse persistente em cão"),
    "Consulta por picazón severa en hámster":
        ("Consultation for hamster with severe itching",
         "Consulta por coceira severa em hamster"),
    "Consulta perro Labrador Bruno con secrecion nasal y fiebre":
        ("Consultation for Labrador dog Bruno with nasal discharge and fever",
         "Consulta do cão Labrador Bruno com secreção nasal e febre"),
    "Consulta perro Labrador Simba con tos y ojos lagrimosos":
        ("Consultation for Labrador dog Simba with cough and watery eyes",
         "Consulta do cão Labrador Simba com tosse e olhos lacrimejantes"),
    "Consulta perra Labrador Nala con diarrea y fiebre":
        ("Consultation for female Labrador Nala with diarrhea and fever",
         "Consulta da cadela Labrador Nala com diarreia e febre"),
    "Consulta cachorra Labrador Sasha con fiebre y tos seca":
        ("Consultation for female Labrador puppy Sasha with fever and dry cough",
         "Consulta da filhote Labrador Sasha com febre e tosse seca"),
    "Consulta perro Labrador Coco con estornudos y decaimiento":
        ("Consultation for Labrador dog Coco with sneezing and malaise",
         "Consulta do cão Labrador Coco com espirros e prostração"),
    "Consulta perro Labrador Titan por vomitos y secrecion ocular":
        ("Consultation for Labrador dog Titan with vomiting and eye discharge",
         "Consulta do cão Labrador Titan por vômitos e secreção ocular"),
    "Consulta perra Labrador Lola con convulsiones leves":
        ("Consultation for female Labrador Lola with mild seizures",
         "Consulta da cadela Labrador Lola com convulsões leves"),
    "Consulta cachorro Labrador Duke con fiebre alta":
        ("Consultation for Labrador puppy Duke with high fever",
         "Consulta do filhote Labrador Duke com febre alta"),
    "Consulta hamster ruso con sed excesiva":
        ("Consultation for Russian hamster with excessive thirst",
         "Consulta do hamster russo com sede excessiva"),
    "Consulta cerdo Landrace por infertilidad":
        ("Consultation for Landrace pig due to infertility",
         "Consulta do porco Landrace por infertilidade"),
    "Consulta por secrecion nasal en perra Labrador Bella":
        ("Consultation for female Labrador Bella with nasal discharge",
         "Consulta por secreção nasal na cadela Labrador Bella"),
    "Consulta por tos y fiebre en perro Labrador Rex":
        ("Consultation for Labrador dog Rex with cough and fever",
         "Consulta por tosse e febre no cão Labrador Rex"),
    "Debridamiento zona micotica gata Maine Coon Kira":
        ("Surgical debridement of mycotic area in Maine Coon cat Kira",
         "Debridamento de área micótica na gata Maine Coon Kira"),
    "Cierre herida profunda pata oveja Suffolk":
        ("Closure of deep wound on Suffolk sheep leg",
         "Fechamento de ferida profunda na pata da ovelha Suffolk"),
    "Cesarea cerda Duroc por complicacion del parto":
        ("Cesarean section for Duroc sow due to birth complication",
         "Cesariana na porca Duroc por complicação no parto"),
    "Extracción de cuerpo extraño en estómago de gato Siamés Luna":
        ("Foreign body removal from Siamese cat Luna's stomach",
         "Extração de corpo estranho do estômago do gato Siamês Luna"),
    "Exploracion intestinal conejo con obstruccion":
        ("Intestinal exploration in rabbit with obstruction",
         "Exploração intestinal em coelho com obstrução"),
    "Toma de muestra pulmonar loro con influenza":
        ("Lung tissue sample from parrot with influenza",
         "Coleta de amostra pulmonar de papagaio com influenza"),
    "Drenaje fluido abdominal pez Betta Azul":
        ("Abdominal fluid drainage from Blue Betta fish",
         "Drenagem de fluido abdominal do peixe Betta Azul"),
    "Exploracion gastrointestinal perro Beagle Buddy":
        ("Gastrointestinal exploration in Beagle dog Buddy",
         "Exploração gastrointestinal no cão Beagle Buddy"),
    "Puncion de rumen para liberar gas oveja timpanismo":
        ("Rumen puncture to release gas in bloated sheep",
         "Punção de rúmen para liberar gás em ovelha com timpanismo"),
    "Instalacion cateter central para suero cerdita":
        ("Central catheter placement for IV fluids in piglet",
         "Instalação de cateter central para soro na leitoa"),
    "Castracion cerdo Landrace Manchas para control brucelosis":
        ("Castration of Landrace pig Manchas for brucellosis control",
         "Castração do porco Landrace Manchas para controle de brucelose"),
    "Limpieza quirurgica sacos aereos periquito con aspergilosis":
        ("Surgical lavage of air sacs in budgerigar with aspergillosis",
         "Limpeza cirúrgica dos sacos aéreos do periquito com aspergilose"),
    "Reseccion y drenaje absceso dental conejo Rex Pitufo":
        ("Resection and drainage of dental abscess in rabbit Rex Pitufo",
         "Ressecção e drenagem do abscesso dentário no coelho Rex Pitufo"),
    "Drenaje quirurgico del oido medio perra Cocker Canela":
        ("Surgical drainage of middle ear in Cocker Spaniel female Canela",
         "Drenagem cirúrgica do ouvido médio na cadela Cocker Spaniel Canela"),
    "Colocacion microchip regulador insulina hamster Pelusa":
        ("Insulin-regulating microchip implantation in hamster Pelusa",
         "Implantação de microchip regulador de insulina no hamster Pelusa"),
    "Toma de muestra para confirmar encefalitis loro":
        ("Sample collection to confirm encephalitis in parrot",
         "Coleta de amostra para confirmar encefalite em papagaio"),
    "Castración quirúrgica en perro Pug Thor":
        ("Surgical castration of Pug dog Thor",
         "Castração cirúrgica no cão Pug Thor"),
    "Ovariohisterectomía en gata Persa Michi":
        ("Ovariohysterectomy in Persian cat Michi",
         "Ovário-histerectomia na gata Persa Michi"),
    "Reparación de fisura en caparazón de tortuga Mediterránea":
        ("Shell fracture repair in Mediterranean tortoise",
         "Reparação de fissura na carapaça de tartaruga Mediterrânea"),
    "Fijación de fractura en pata de perro Golden Max":
        ("Fracture fixation in Golden dog Max's leg",
         "Fixação de fratura na pata do cão Golden Max"),
    "Biopsia de nódulo en conejo Mini Lop Conejito":
        ("Nodule biopsy in Mini Lop rabbit Conejito",
         "Biópsia de nódulo em coelho Mini Lop Conejito"),
    "Extracción de molar en perro Labrador Rocky":
        ("Molar extraction in Labrador dog Rocky",
         "Extração de molar no cão Labrador Rocky"),
    "Corrección de malformación de pico en loro Amazónico":
        ("Beak malformation correction in Amazonian parrot",
         "Correção de malformação de bico em papagaio Amazônico"),
    "Amputación de dedo gangrenado en cerdo Mini Pig":
        ("Amputation of gangrenous digit in Mini Pig",
         "Amputação de dedo gangrenado em Mini Pig"),
    "Cesárea de emergencia en oveja Merino Nube":
        ("Emergency cesarean section in Merino sheep Nube",
         "Cesariana de emergência em ovelha Merino Nube"),
    "PCR moquillo cachorra Labrador Sasha":
        ("PCR for distemper in female Labrador puppy Sasha",
         "PCR de cinomose na filhote Labrador Sasha"),
    "Hemograma perro Labrador Coco con sospecha moquillo":
        ("Blood count for Labrador dog Coco with suspected distemper",
         "Hemograma do cão Labrador Coco com suspeita de cinomose"),
    "Hisopado nasal perro Labrador Simba":
        ("Nasal swab for Labrador dog Simba",
         "Swab nasal do cão Labrador Simba"),
    "PCR moquillo perra Labrador Nala":
        ("PCR for distemper in female Labrador Nala",
         "PCR de cinomose na cadela Labrador Nala"),
    "Cultivo secrecion nasal perro Labrador Bruno":
        ("Nasal discharge culture for Labrador dog Bruno",
         "Cultura de secreção nasal do cão Labrador Bruno"),
    "Radiografia torax perro Labrador Titan":
        ("Chest X-ray for Labrador dog Titan",
         "Radiografia de tórax do cão Labrador Titan"),
    "EEG perra Labrador Lola con signos neurologicos":
        ("EEG for female Labrador Lola with neurological signs",
         "EEG da cadela Labrador Lola com sinais neurológicos"),
    "PCR moquillo cachorro Labrador Duke":
        ("PCR for distemper in Labrador puppy Duke",
         "PCR de cinomose no filhote Labrador Duke"),
    "Endoscopia respiratoria periquito Kiwi":
        ("Respiratory endoscopy in budgerigar Kiwi",
         "Endoscopia respiratória no periquito Kiwi"),
    "Rx mandibula conejo Rex Pitufo":
        ("Jaw X-ray for rabbit Rex Pitufo",
         "Rx mandíbula do coelho Rex Pitufo"),
    "Evaluacion oido medio perra Cocker Canela":
        ("Middle ear evaluation for Cocker Spaniel female Canela",
         "Avaliação do ouvido médio da cadela Cocker Spaniel Canela"),
    "EEG loro con signos neurologicos":
        ("EEG for parrot with neurological signs",
         "EEG do papagaio com sinais neurológicos"),
    "Analisis de sangre perra Labrador Bella":
        ("Blood analysis for female Labrador Bella",
         "Análise de sangue da cadela Labrador Bella"),
    "Test PCR moquillo perro Labrador Rex":
        ("PCR test for distemper in Labrador dog Rex",
         "Teste PCR de cinomose no cão Labrador Rex"),
    "Perfil glucemico hamster ruso Pelusa":
        ("Glycemic profile for Russian hamster Pelusa",
         "Perfil glicêmico do hamster russo Pelusa"),
    "Test serologico brucelosis cerdo Manchas":
        ("Brucellosis serological test for pig Manchas",
         "Teste sorológico de brucelose no porco Manchas"),
    "Evaluacion timpanismo oveja Woolly":
        ("Bloat evaluation for sheep Woolly",
         "Avaliação de timpanismo na ovelha Woolly"),
    "Medicion glucosa cerdita Piggy":
        ("Glucose measurement for piglet Piggy",
         "Medição de glicose na leitoa Piggy"),
    "Coprocultivo conejo Angora Tobias":
        ("Stool culture for Angora rabbit Tobias",
         "Coprocultivo do coelho Angorá Tobias"),
    "Test PCR muestra fecal cerdo Duroc Porky":
        ("PCR test on fecal sample from Duroc pig Porky",
         "Teste PCR de amostra fecal do porco Duroc Porky"),
    "Examen UV piel gata Maine Coon Kira":
        ("UV skin examination of Maine Coon cat Kira",
         "Exame UV da pele da gata Maine Coon Kira"),
    "Ecografía de control en tortuga Mediterránea":
        ("Control ultrasound in Mediterranean tortoise",
         "Ecografia de controle em tartaruga Mediterrânea"),
    "PCR influenza loro Amazona":
        ("Influenza PCR for parrot Amazona",
         "PCR de influenza para papagaio Amazona"),
    "Evaluacion entorno y agua pez Betta Azul":
        ("Environment and water evaluation for Blue Betta fish",
         "Avaliação do ambiente e da água do peixe Betta Azul"),
    "Hisopado faringeo perro Beagle Buddy":
        ("Pharyngeal swab for Beagle dog Buddy",
         "Swab faríngeo do cão Beagle Buddy"),
    "Analisis heces oveja Suffolk Lanita":
        ("Fecal analysis for Suffolk sheep Lanita",
         "Análise de fezes da ovelha Suffolk Lanita"),
    "Radiografía de tórax en oveja Merino Nube":
        ("Chest X-ray in Merino sheep Nube",
         "Radiografia de tórax em ovelha Merino Nube"),
    "Hemocultivo en cerdo Mini Pig Pumba":
        ("Blood culture in Mini Pig Pumba",
         "Hemocultura no Mini Pig Pumba"),
    "Hisopado nasal a gallina Rhode Island":
        ("Nasal swab for Rhode Island hen",
         "Swab nasal em galinha Rhode Island"),
    "Examen de oídos en perro Labrador Rocky":
        ("Ear examination in Labrador dog Rocky",
         "Exame de ouvidos no cão Labrador Rocky"),
    "Análisis de sangre completo al gato Persa":
        ("Complete blood analysis for Persian cat",
         "Análise de sangue completa no gato Persa"),
    "Biopsia de nódulos cutáneos en conejo Mini Lop":
        ("Skin nodule biopsy in Mini Lop rabbit",
         "Biópsia de nódulos cutâneos em coelho Mini Lop"),
    "Test PCR para moquillo en perro Golden":
        ("PCR test for distemper in Golden dog",
         "Teste PCR para cinomose em cão Golden"),
    "Raspado de piel en hámster Sirio":
        ("Skin scraping in Syrian hamster",
         "Raspado de pele em hamster Sírio"),
    "Cultivo de secreción nasal en loro Amazónico":
        ("Nasal discharge culture in Amazonian parrot",
         "Cultura de secreção nasal em papagaio Amazônico"),
}

# ── Props that copy ES value unchanged to all 3 langs (proper names) ──────────
COPY_AS_IS = {"nombreAnimal", "nombre"}

# ── Main transformation ────────────────────────────────────────────────────────

def xml_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;")

def make_triple(prop: str, es: str, en: str, pt: str, indent: str) -> str:
    return (
        f'{indent}<vet:{prop} xml:lang="es">{xml_escape(es)}</vet:{prop}>\n'
        f'{indent}<vet:{prop} xml:lang="en">{xml_escape(en)}</vet:{prop}>\n'
        f'{indent}<vet:{prop} xml:lang="pt">{xml_escape(pt)}</vet:{prop}>'
    )

def replace_match(m: re.Match, prop: str) -> str:
    indent, val = m.group(1), m.group(2)
    if prop in COPY_AS_IS:
        return make_triple(prop, val, val, val, indent)
    table = T.get(prop, {})
    if val in table:
        en, pt = table[val]
        return make_triple(prop, val, en, pt, indent)
    print(f"WARNING: no translation for vet:{prop} = {val!r}", file=sys.stderr)
    return make_triple(prop, val, val, val, indent)  # safe fallback

def transform(content: str) -> str:
    all_props = set(T.keys()) | COPY_AS_IS
    for prop in all_props:
        pat = re.compile(
            rf'^( *)<vet:{re.escape(prop)}>([^<]*)</vet:{re.escape(prop)}>',
            re.MULTILINE
        )
        content = pat.sub(lambda m, p=prop: replace_match(m, p), content)
    return content

def main() -> None:
    print(f"Reading {INPUT} …")
    content = INPUT.read_text(encoding="utf-8")

    print("Applying translations …")
    result = transform(content)

    print(f"Writing {OUTPUT} …")
    OUTPUT.write_text(result, encoding="utf-8", newline="\n")
    print("Done.")

if __name__ == "__main__":
    main()
