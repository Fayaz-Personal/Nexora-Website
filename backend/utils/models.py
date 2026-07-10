from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, Date, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.sql import func
from utils.db import Base

class Country(Base):
    __tablename__ = 'countries'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    visa_info = Column(Text)
    average_living_cost = Column(Numeric(10, 2))
    currency = Column(String(10))

class University(Base):
    __tablename__ = 'universities'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    country_id = Column(Integer, ForeignKey('countries.id', ondelete='CASCADE'))
    logo_url = Column(Text)
    ranking = Column(Integer)
    tuition_fee_min = Column(Numeric(10, 2))
    tuition_fee_max = Column(Numeric(10, 2))
    acceptance_rate = Column(Numeric(5, 2))
    description = Column(Text)
    website = Column(String(255))
    application_procedure = Column(Text)
    eligibility_requirements = Column(Text)

class Course(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True)
    university_id = Column(Integer, ForeignKey('universities.id', ondelete='CASCADE'))
    name = Column(String(255), nullable=False)
    degree_type = Column(String(50), nullable=False)
    department = Column(String(100), nullable=False)
    duration = Column(String(50))
    fees = Column(Numeric(10, 2))
    description = Column(Text)

class Scholarship(Base):
    __tablename__ = 'scholarships'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    provider = Column(String(255))
    type = Column(String(50), nullable=False)
    amount = Column(String(255))
    eligibility_criteria = Column(Text)
    deadline = Column(Date)
    coverage = Column(String(255))

class Accommodation(Base):
    __tablename__ = 'accommodations'
    id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey('countries.id', ondelete='CASCADE'))
    city_name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    rent = Column(Numeric(10, 2), nullable=False)
    distance_to_univ = Column(String(100))
    availability = Column(Boolean, default=True)
    facilities = Column(ARRAY(Text))
    title = Column(String(255), nullable=False)
    description = Column(Text)

class Visa(Base):
    __tablename__ = 'visas'
    id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey('countries.id', ondelete='CASCADE'), unique=True)
    requirements = Column(Text)
    documents_required = Column(ARRAY(Text))
    timeline = Column(String(100))
    fee = Column(Numeric(10, 2))
    checklist_json = Column(JSONB)

class Flight(Base):
    __tablename__ = 'flights'
    id = Column(Integer, primary_key=True)
    origin = Column(String(100), nullable=False)
    destination_country_id = Column(Integer, ForeignKey('countries.id', ondelete='CASCADE'))
    est_cost = Column(Numeric(10, 2), nullable=False)
    checklist_json = Column(JSONB)

class PendingUpdate(Base):
    __tablename__ = 'pending_updates'
    id = Column(Integer, primary_key=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer)
    old_data = Column(JSONB)
    new_data = Column(JSONB, nullable=False)
    confidence_score = Column(Numeric(5, 2))
    status = Column(String(50), default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AIActivityLog(Base):
    __tablename__ = 'ai_activity_logs'
    id = Column(Integer, primary_key=True)
    agent_name = Column(String(100), nullable=False)
    website = Column(String(255), nullable=False)
    records_collected = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    failure_reason = Column(Text)
    processing_time = Column(Numeric(10, 2))
    status = Column(String(50), default='completed')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SecurityAuditLog(Base):
    __tablename__ = 'security_audit_logs'
    id = Column(Integer, primary_key=True)
    event_type = Column(String(100), nullable=False)
    user_id = Column(Integer)
    description = Column(Text, nullable=False)
    ip_address = Column(String(45))
    event_metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EntranceExam(Base):
    __tablename__ = 'entrance_exams'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    syllabus = Column(Text)
    registration_link = Column(String(255))
    test_dates = Column(JSONB)
    resources_json = Column(JSONB)

class CourseExamRequirement(Base):
    __tablename__ = 'course_exam_requirements'
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'))
    exam_id = Column(Integer, ForeignKey('entrance_exams.id', ondelete='CASCADE'))
    min_score = Column(String(50))

class LivingCost(Base):
    __tablename__ = 'living_costs'
    id = Column(Integer, primary_key=True)
    country_id = Column(Integer, ForeignKey('countries.id', ondelete='CASCADE'), unique=True)
    rent = Column(Numeric(10, 2), nullable=False)
    food = Column(Numeric(10, 2), nullable=False)
    transport = Column(Numeric(10, 2), nullable=False)
    insurance = Column(Numeric(10, 2), nullable=False)
    miscellaneous = Column(Numeric(10, 2), nullable=False)

class CurrencyRate(Base):
    __tablename__ = 'currency_rates'
    code = Column(String(10), primary_key=True)
    rate_to_usd = Column(Numeric(12, 6), nullable=False)

class RankingHistory(Base):
    __tablename__ = 'ranking_history'
    id = Column(Integer, primary_key=True)
    university_id = Column(Integer, ForeignKey('universities.id', ondelete='CASCADE'), nullable=False)
    qs_rank = Column(Integer)
    overall_score = Column(Numeric(5, 2))
    country = Column(String(100))
    region = Column(String(100))
    year_of_ranking = Column(Integer)
    ranking_source = Column(String(150))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
