from sentence_transformers import SentenceTransformer, util

# Load the model once
model = SentenceTransformer('all-MiniLM-L6-v2')

education_order = [
    'Not Provided', 'Unspecified', 'Some High School Coursework', 'High School or equivalent',
    'Vocational - HS Diploma', 'Some College Coursework Completed', 'Certification',
    'Vocational', 'Vocational - Degree', 'Associate Degree', "Bachelor's Degree",
    "Master's Degree", 'Doctorate', 'Professional'
]

employment_order = [
    'Not Provided', 'Other', 'Temporary', 'Contract', 'Part-time', 'Full-time'
]

def get_best_match(text, categories):
    text_embedding = model.encode(text, convert_to_tensor=True)
    category_embeddings = model.encode(categories, convert_to_tensor=True)
    scores = util.cos_sim(text_embedding, category_embeddings)[0]
    best_idx = scores.argmax().item()
    return categories[best_idx]

def extract_education_employment(text):
    edu = get_best_match(text, education_order)
    emp = get_best_match(text, employment_order)
    return edu, emp

if __name__ == "__main__":
    print("🔍 Job Description or Resume Snippet Analyzer")
    user_input = input("Enter the job description or education/employment info:\n> ")

    edu, emp = extract_education_employment(user_input)

    print("\n🎓 Education Level Detected:", edu)
    print("💼 Employment Type Detected:", emp)
