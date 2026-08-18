"""
Fix incorrect university website URLs in the database.
Many URLs were auto-generated as fake .edu domains by the scraper.
This script replaces them with the actual official URLs.
Run with: python backend/scripts/fix_university_urls.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import SessionLocal
from sqlalchemy import text

# Map of university name keywords -> correct official URL
# Covers the most common universities that would be in a top-1500 list
UNIVERSITY_URL_MAP = [
    # United States
    ("Massachusetts Institute of Technology", "https://www.mit.edu"),
    ("Stanford University", "https://www.stanford.edu"),
    ("Harvard University", "https://www.harvard.edu"),
    ("California Institute of Technology", "https://www.caltech.edu"),
    ("University of Chicago", "https://www.uchicago.edu"),
    ("Columbia University", "https://www.columbia.edu"),
    ("Yale University", "https://www.yale.edu"),
    ("Princeton University", "https://www.princeton.edu"),
    ("Cornell University", "https://www.cornell.edu"),
    ("Johns Hopkins University", "https://www.jhu.edu"),
    ("University of Pennsylvania", "https://www.upenn.edu"),
    ("Duke University", "https://www.duke.edu"),
    ("Northwestern University", "https://www.northwestern.edu"),
    ("Dartmouth College", "https://www.dartmouth.edu"),
    ("Brown University", "https://www.brown.edu"),
    ("Vanderbilt University", "https://www.vanderbilt.edu"),
    ("Rice University", "https://www.rice.edu"),
    ("University of Notre Dame", "https://www.nd.edu"),
    ("Georgetown University", "https://www.georgetown.edu"),
    ("Emory University", "https://www.emory.edu"),
    ("Washington University in St. Louis", "https://wustl.edu"),
    ("Carnegie Mellon University", "https://www.cmu.edu"),
    ("University of California, Berkeley", "https://www.berkeley.edu"),
    ("University of California, Los Angeles", "https://www.ucla.edu"),
    ("University of California, San Diego", "https://ucsd.edu"),
    ("University of California, Santa Barbara", "https://www.ucsb.edu"),
    ("University of California, Davis", "https://www.ucdavis.edu"),
    ("University of California, Irvine", "https://uci.edu"),
    ("University of Michigan", "https://umich.edu"),
    ("University of Virginia", "https://www.virginia.edu"),
    ("University of North Carolina", "https://www.unc.edu"),
    ("University of Wisconsin", "https://www.wisc.edu"),
    ("University of Illinois", "https://illinois.edu"),
    ("University of Texas at Austin", "https://www.utexas.edu"),
    ("Georgia Institute of Technology", "https://www.gatech.edu"),
    ("University of Washington", "https://www.washington.edu"),
    ("Boston University", "https://www.bu.edu"),
    ("Tufts University", "https://www.tufts.edu"),
    ("New York University", "https://www.nyu.edu"),
    ("University of Southern California", "https://www.usc.edu"),
    ("Purdue University", "https://www.purdue.edu"),
    ("Ohio State University", "https://www.osu.edu"),
    ("Pennsylvania State University", "https://www.psu.edu"),
    ("Michigan State University", "https://msu.edu"),
    ("University of Minnesota", "https://twin-cities.umn.edu"),
    ("University of Arizona", "https://www.arizona.edu"),
    ("Arizona State University", "https://www.asu.edu"),
    ("University of Colorado", "https://www.colorado.edu"),
    ("University of Florida", "https://www.ufl.edu"),
    ("Florida State University", "https://www.fsu.edu"),
    ("University of Miami", "https://www.miami.edu"),
    ("Northeastern University", "https://www.northeastern.edu"),
    ("Boston College", "https://www.bc.edu"),
    ("Georgetown University", "https://www.georgetown.edu"),
    ("American University", "https://www.american.edu"),
    ("George Washington University", "https://www.gwu.edu"),

    # United Kingdom
    ("University of Oxford", "https://www.ox.ac.uk"),
    ("University of Cambridge", "https://www.cam.ac.uk"),
    ("Imperial College London", "https://www.imperial.ac.uk"),
    ("University College London", "https://www.ucl.ac.uk"),
    ("London School of Economics", "https://www.lse.ac.uk"),
    ("University of Edinburgh", "https://www.ed.ac.uk"),
    ("University of Manchester", "https://www.manchester.ac.uk"),
    ("King's College London", "https://www.kcl.ac.uk"),
    ("University of Bristol", "https://www.bristol.ac.uk"),
    ("University of Warwick", "https://warwick.ac.uk"),
    ("University of Glasgow", "https://www.gla.ac.uk"),
    ("University of Birmingham", "https://www.birmingham.ac.uk"),
    ("University of Leeds", "https://www.leeds.ac.uk"),
    ("University of Sheffield", "https://www.sheffield.ac.uk"),
    ("University of Southampton", "https://www.southampton.ac.uk"),
    ("University of Nottingham", "https://www.nottingham.ac.uk"),
    ("University of Leicester", "https://le.ac.uk"),
    ("Durham University", "https://www.durham.ac.uk"),
    ("University of Exeter", "https://www.exeter.ac.uk"),
    ("University of Bath", "https://www.bath.ac.uk"),
    ("University of Liverpool", "https://www.liverpool.ac.uk"),
    ("Newcastle University", "https://www.ncl.ac.uk"),
    ("Cardiff University", "https://www.cardiff.ac.uk"),
    ("Queen's University Belfast", "https://www.qub.ac.uk"),
    ("University of St Andrews", "https://www.st-andrews.ac.uk"),

    # Germany
    ("Technical University of Munich", "https://www.tum.de"),
    ("Ludwig Maximilian University of Munich", "https://www.lmu.de"),
    ("Heidelberg University", "https://www.uni-heidelberg.de"),
    ("Humboldt University of Berlin", "https://www.hu-berlin.de"),
    ("Free University of Berlin", "https://www.fu-berlin.de"),
    ("RWTH Aachen University", "https://www.rwth-aachen.de"),
    ("University of Hamburg", "https://www.uni-hamburg.de"),
    ("University of Frankfurt", "https://www.uni-frankfurt.de"),
    ("University of Cologne", "https://www.uni-koeln.de"),
    ("University of Bonn", "https://www.uni-bonn.de"),
    ("University of Stuttgart", "https://www.uni-stuttgart.de"),
    ("Karlsruhe Institute of Technology", "https://www.kit.edu"),
    ("University of Freiburg", "https://www.uni-freiburg.de"),
    ("University of Tübingen", "https://www.uni-tuebingen.de"),
    ("University of Göttingen", "https://www.uni-goettingen.de"),
    ("University of Mannheim", "https://www.uni-mannheim.de"),
    ("TU Berlin", "https://www.tu-berlin.de"),
    ("TU Dresden", "https://tu-dresden.de"),
    ("University of Bochum", "https://www.ruhr-uni-bochum.de"),
    ("University of Münster", "https://www.uni-muenster.de"),

    # Canada
    ("University of Toronto", "https://www.utoronto.ca"),
    ("McGill University", "https://www.mcgill.ca"),
    ("University of British Columbia", "https://www.ubc.ca"),
    ("McMaster University", "https://www.mcmaster.ca"),
    ("University of Alberta", "https://www.ualberta.ca"),
    ("University of Waterloo", "https://uwaterloo.ca"),
    ("Western University", "https://www.uwo.ca"),
    ("Queen's University", "https://www.queensu.ca"),
    ("Dalhousie University", "https://www.dal.ca"),
    ("University of Ottawa", "https://www.uottawa.ca"),
    ("University of Calgary", "https://www.ucalgary.ca"),
    ("Simon Fraser University", "https://www.sfu.ca"),

    # Australia
    ("University of Melbourne", "https://www.unimelb.edu.au"),
    ("Australian National University", "https://www.anu.edu.au"),
    ("University of Sydney", "https://www.sydney.edu.au"),
    ("University of Queensland", "https://www.uq.edu.au"),
    ("Monash University", "https://www.monash.edu"),
    ("University of New South Wales", "https://www.unsw.edu.au"),
    ("University of Western Australia", "https://www.uwa.edu.au"),
    ("University of Adelaide", "https://www.adelaide.edu.au"),
    ("Macquarie University", "https://www.mq.edu.au"),
    ("RMIT University", "https://www.rmit.edu.au"),
    ("University of Technology Sydney", "https://www.uts.edu.au"),
    ("Curtin University", "https://www.curtin.edu.au"),

    # Singapore
    ("National University of Singapore", "https://www.nus.edu.sg"),
    ("Nanyang Technological University", "https://www.ntu.edu.sg"),
    ("Singapore Management University", "https://www.smu.edu.sg"),

    # China
    ("Peking University", "https://english.pku.edu.cn"),
    ("Tsinghua University", "https://www.tsinghua.edu.cn"),
    ("Fudan University", "https://www.fudan.edu.cn"),
    ("Shanghai Jiao Tong University", "https://www.sjtu.edu.cn"),
    ("Zhejiang University", "https://www.zju.edu.cn"),
    ("University of Science and Technology of China", "https://www.ustc.edu.cn"),

    # Japan
    ("University of Tokyo", "https://www.u-tokyo.ac.jp"),
    ("Kyoto University", "https://www.kyoto-u.ac.jp"),
    ("Osaka University", "https://www.osaka-u.ac.jp"),
    ("Tohoku University", "https://www.tohoku.ac.jp"),
    ("Tokyo Institute of Technology", "https://www.titech.ac.jp"),
    ("Nagoya University", "https://www.nagoya-u.ac.jp"),

    # Netherlands
    ("Delft University of Technology", "https://www.tudelft.nl"),
    ("University of Amsterdam", "https://www.uva.nl"),
    ("Utrecht University", "https://www.uu.nl"),
    ("Leiden University", "https://www.universiteitleiden.nl"),
    ("Eindhoven University of Technology", "https://www.tue.nl"),
    ("Erasmus University Rotterdam", "https://www.eur.nl"),
    ("Wageningen University", "https://www.wur.nl"),
    ("Groningen University", "https://www.rug.nl"),
    ("Maastricht University", "https://www.maastrichtuniversity.nl"),
    ("VU Amsterdam", "https://vu.nl"),

    # Switzerland
    ("ETH Zurich", "https://ethz.ch"),
    ("EPFL", "https://www.epfl.ch"),
    ("University of Zurich", "https://www.uzh.ch"),
    ("University of Geneva", "https://www.unige.ch"),
    ("University of Basel", "https://www.unibas.ch"),
    ("University of Bern", "https://www.unibe.ch"),

    # France
    ("École Polytechnique", "https://www.polytechnique.edu"),
    ("Sciences Po", "https://www.sciencespo.fr"),
    ("Sorbonne University", "https://www.sorbonne-universite.fr"),
    ("Paris-Saclay University", "https://www.universite-paris-saclay.fr"),
    ("HEC Paris", "https://www.hec.edu"),
    ("INSEAD", "https://www.insead.edu"),

    # Sweden
    ("Karolinska Institute", "https://ki.se"),
    ("KTH Royal Institute of Technology", "https://www.kth.se"),
    ("Lund University", "https://www.lu.se"),
    ("Uppsala University", "https://www.uu.se"),
    ("Stockholm University", "https://www.su.se"),
    ("Chalmers University of Technology", "https://www.chalmers.se"),

    # Other notable universities
    ("University of Copenhagen", "https://www.ku.dk"),
    ("Aarhus University", "https://www.au.dk"),
    ("University of Helsinki", "https://www.helsinki.fi"),
    ("Aalto University", "https://www.aalto.fi"),
    ("Norwegian University of Science and Technology", "https://www.ntnu.edu"),
    ("University of Oslo", "https://www.uio.no"),
    ("KU Leuven", "https://www.kuleuven.be"),
    ("Ghent University", "https://www.ugent.be"),
    ("University of Vienna", "https://www.univie.ac.at"),
    ("TU Wien", "https://www.tuwien.at"),
    ("Trinity College Dublin", "https://www.tcd.ie"),
    ("University College Dublin", "https://www.ucd.ie"),
    ("University of Hong Kong", "https://www.hku.hk"),
    ("Hong Kong University of Science and Technology", "https://www.ust.hk"),
    ("Chinese University of Hong Kong", "https://www.cuhk.edu.hk"),
    ("Seoul National University", "https://www.snu.ac.kr"),
    ("KAIST", "https://www.kaist.ac.kr"),
    ("Pohang University of Science and Technology", "https://www.postech.ac.kr"),
    ("University of São Paulo", "https://www5.usp.br"),
    ("Tel Aviv University", "https://www.tau.ac.il"),
    ("Hebrew University of Jerusalem", "https://www.huji.ac.il"),
    ("Technion", "https://www.technion.ac.il"),
    ("University of Cape Town", "https://www.uct.ac.za"),
    ("Indian Institute of Technology Bombay", "https://www.iitb.ac.in"),
    ("Indian Institute of Technology Delhi", "https://www.iitd.ac.in"),
    ("Indian Institute of Technology Madras", "https://www.iitm.ac.in"),
    ("Indian Institute of Technology Kanpur", "https://www.iitk.ac.in"),
    ("Indian Institute of Science", "https://www.iisc.ac.in"),
]

def fix_university_urls():
    db = SessionLocal()
    updated = 0
    skipped = 0
    
    try:
        # Get all universities
        result = db.execute(text("SELECT id, name, website FROM universities ORDER BY ranking ASC"))
        universities = result.fetchall()
        print(f"Found {len(universities)} universities in database.")
        print("Checking and fixing URLs...\n")

        for univ_id, name, current_url in universities:
            matched_url = None

            # Try to find a match in our URL map
            for map_name, correct_url in UNIVERSITY_URL_MAP:
                if map_name.lower() in name.lower() or name.lower() in map_name.lower():
                    matched_url = correct_url
                    break

            # Check if current URL looks fake (auto-generated pattern)
            is_fake = (
                not current_url or
                (current_url and 
                 not current_url.startswith('http') or
                 any(bad in current_url for bad in ['.edu//', '//www.mit', 'universitylondon', 
                     'collegelondon', 'imperialcollege', 'universityof']))
            )

            if matched_url and (is_fake or matched_url != current_url):
                db.execute(
                    text("UPDATE universities SET website = :url WHERE id = :id"),
                    {"url": matched_url, "id": univ_id}
                )
                print(f"  ✓ {name}")
                print(f"    Old: {current_url}")
                print(f"    New: {matched_url}\n")
                updated += 1
            else:
                skipped += 1

        db.commit()
        print(f"\nDone! Updated: {updated}, Skipped (already correct or unknown): {skipped}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_university_urls()
