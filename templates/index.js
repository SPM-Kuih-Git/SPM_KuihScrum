const GET_ROLES_URL = "http://127.0.0.1:5100/roles";
const GET_ROLE_SKILLS_URL = "http://127.0.0.1:5100/rolesSkills";
const GET_USER_SKILLS_URL = "http://127.0.0.1:5100/userSkills";
const GET_JOB_LISTING_URL = "http://127.0.0.1:5100/joblistings";
const GET_APPLIED_JOBS_URL = "http://127.0.0.1:5100/get_applied_jobs_for_user";
const GET_ALIGNMENT_URL = "http://127.0.0.1:5100/calculateAlignment";
const APPLY_JOB_URL = "http://127.0.0.1:5100/apply_for_job";
const WITHDRAW_APPLICATION_URL = "http://127.0.0.1:5100/withdraw_application";
const GET_SKILLS_URL = "http://127.0.0.1:5100/skills";

// import components 
import Navbar from "./components/navbar.js";

// codes to simulate session
const urlParams = new URLSearchParams(window.location.search);
var rights = urlParams.get("rights");
if (rights === '{{accessRight}}') 
  rights = 0;

// Vue
const jobsPage = Vue.createApp({
  data() {
    return {
      staffID: "140001",
      jobListings: [],
      alignmentPercentage: 0, 
      allSkills: [],
      selectedSkills: [], 
      originalJobListings: [], 
      roles: {},
      accessRight: rights,
      searchInput: '',
      searchBy: 0,
      roleSkills: {},
      userSkills: [],
      skillsMatchDict: {},
      // ---------------- FOR APPLY/WITHDRAW (START) ----------------
      appliedJobs: [],
      applyStyle: "btn btn-primary btn-block mt-2",
      withdrawStyle: "btn btn-secondary btn-block mt-2",
      // ---------------- FOR APPLY/WITHDRAW (END) ----------------
      // apply or withdraw errorMsg (for error modal)
      errorMsg: "",
    };
  },

  components: {
    Navbar,
  },

  mounted() {
    this.getUserSkills(this.staffID);
    this.getAllSkills();
  },
  // Inside the script section
  computed: {
    sortedSkills() {
          // Extract all skills from the roles and sort them alphabetically
          const allSkillsArray = Object.values(this.allSkills).flat();
          const uniqueSkillsSet = new Set(allSkillsArray);
          const uniqueSortedSkills = Array.from(uniqueSkillsSet).sort((a, b) => a.localeCompare(b));
          return uniqueSortedSkills;
    },
    groupedSkills() {
        const grouped = {};
        for (let i = 0; i < this.sortedSkills.length; i++) {
            const skill = this.sortedSkills[i];
            const firstLetter = skill.charAt(0).toUpperCase();
            if (!grouped[firstLetter]) {
                grouped[firstLetter] = [];
            }
            grouped[firstLetter].push(skill);
        }
        return grouped;
    },
    alphabet() {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    },
  },

  methods: {
    // this function will get all job listings for the staff and hr. Staff will only see job listings that are not closed.
    // within this function, it also calls 2 methods to populate the roles and populate the role descriptions (vue data properties)
    // the 2 functions were not placed at mounted as the page would refresh after the hr creates a new listings wihch will activate the getAllJobListings() function
    getAllJobListings() {
      axios
        .get(GET_JOB_LISTING_URL)
        .then((response) => {
          this.jobListings = response.data.data.joblistings;
          this.originalJobListings = response.data.data.joblistings;
          var current = new Date();
          const year = current.getFullYear();
          const month = (current.getMonth() + 1).toString().padStart(2, "0"); // Add leading zero if needed
          const day = current.getDate().toString().padStart(2, "0"); // Add leading zero if needed
          const date = `${year}-${month}-${day}`;

          // if the user is Staff, then the job listings will be filtered to only show the job listings that are not closed
          for (let i = this.jobListings.length - 1; i >= 0; i--) {
            const listing = this.jobListings[i];
            // console.log(listing.Closing_date);
            if (listing.Closing_date < date) {
              this.jobListings.splice(i, 1); // Remove the item at index i
            }
          }

          // In JavaScript, you use the .then() method to work with Promises and handle the
          // asynchronous result of an operation. Promises represent the eventual completion (either success or failure)
          // of an asynchronous operation, and .then() is used to specify what should happen when the Promise is resolved (successfully completed).
          this.jobListings.forEach((jobListing) => {
            this.getCalculateAlignment(jobListing.JobList_ID).then((data) => {
              this.skillsMatchDict[jobListing.JobList_ID] = {
                alignment_percentage: data.alignment_percentage,
                role_skills: data.skills_by_role,
                user_skills: this.userSkills,
              };
            });
          });

          // retrieve all the applied roles for the current user
          axios
            .get(GET_APPLIED_JOBS_URL + "/" + this.staffID)
            .then((response) => {
              this.appliedJobs = response.data.data.appliedJobs;
            })
            .catch((error) => {
              console.error("Error fetching applied jobs:", error);
            });

          // these 2 methods are called to populate the roles and roleDescriptions array when the page first loads
          this.getAllRoles();
          this.getRolesSkills();
        })
        .catch((error) => {
          console.log(error);
        });
    },

    // this function will get all the roles and role descriptions
    getAllRoles() {
      // on Vue instance created, load the book list
      axios
        .get(GET_ROLES_URL)
        .then((response) => {
          var roles_list = response.data["data"]["roles"];
          const roleObject = {};

          roles_list.forEach((role) => {
            const role_name = role.Role_Name;
            const role_desc = role.Role_Desc;
            roleObject[role_name] = role_desc;
          });

          this.roles = roleObject;
        })
        .catch((error) => {
          // Errors when calling the service; such as network error,
          // service offline, etc
          console.log(error);
        });
    },

    // this function will get all the roles and their respective skills
    getRolesSkills() {
      axios
        .get(GET_ROLE_SKILLS_URL)
        .then((response) => {
          this.roleSkills = response.data.data.roles_skills[0];
        })
        .catch((error) => {
          console.log(error);
        });
    },

    // this function will get all the user's/applicant's skills
    getUserSkills(userID) {
      return axios
        .get(GET_USER_SKILLS_URL, {
          params: { userID: userID },
        })
        .then((response) => {
          if (this.userSkills.length === 0) {
            this.userSkills = response.data.data.user_skills;
            this.getAllJobListings();
          }
          return response.data.data.user_skills; // Return the skills array
        })
        .catch((error) => {
          console.log(error);
        });
    },

    // Get the alignment percentage for the job listing and the user/applicant
    getCalculateAlignment(joblist_ID, user_Skills = null) {
      if (user_Skills === null) {
        user_Skills = this.userSkills;
      }
      const params = {
        joblist_ID: joblist_ID,
        user_Skills: user_Skills.join(","),
      };
      return axios
        .get(GET_ALIGNMENT_URL, {
          params: params,
        })
        .then((response) => {
          return response.data.data;
        })
        .catch((error) => {
          console.log("error:", error);
        });
    },

    // When the user click on close for the success modal, this method will run to close the createjob modal
    closeModals() {
      var createjobModal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("createJob")
      );
      createjobModal.hide();
      this.getAllJobListings();
    },

    editCloseModals() {
      var editjobModal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("editJob")
      );
      editjobModal.hide();
      this.getAllJobListings();
    },

    // this function will apply or withdraw the job listing for the user
    applyOrWithdraw(event, jobID) {
      // checks if the user has applied for the job listing (appliedJobs array contains the jobListID which the user has already applied for)
      if (!this.appliedJobs.includes(jobID)) {
        // stores the data to send to the apply_job URL
        var dataToSend = {
          JobList_ID: jobID,
          Staff_ID: this.staffID, // Assuming you have the logged-in staff's ID accessible
        };

        // Sending a POST request to apply
        axios
          .post(APPLY_JOB_URL, dataToSend)
          .then((response) => {
            // console.log("Data sent successfully:", response.data);
            if (response.data.code == "200") {
              // only update the button and appliedJobs list if the application is submitted successfully
              this.appliedJobs.push(jobID);
            } else {
              const errorModal = new bootstrap.Modal(
                document.getElementById("errorModal")
              );
              this.errorMsg = "Unable to apply now. Please try again later";
              errorModal.show();
            }
          })
          .catch((error) => {
            // Show the error modal for 404 errors
            const errorModal = new bootstrap.Modal(
              document.getElementById("errorModal")
            );
            this.errorMsg = "Unable to apply now. Please try again later";
            errorModal.show();
            // console.error("Error sending data:", error);
          });

        // console.log("Applied");
      }
      // withdraw function
      else {
        const index = this.appliedJobs.indexOf(jobID);
        
        var dataToSend = {
          JobList_ID: jobID,
          Staff_ID: this.staffID, // Assuming you have the logged-in staff's ID accessible
        };

        // Sending a POST request to withdraw
        axios
          .post(WITHDRAW_APPLICATION_URL, dataToSend)
          .then((response) => {
            if (response.data.code == "200") {
              if (index > -1) {
                this.appliedJobs.splice(index, 1);
              }
            } else {
              const errorModal = new bootstrap.Modal(
                document.getElementById("errorModal")
              );
              this.errorMsg = "Unable to withdraw now. Please try again later";
              errorModal.show();
            }
          })
          .catch((error) => {
            const errorModal = new bootstrap.Modal(
              document.getElementById("errorModal")
            );
            this.errorMsg = "Unable to withdraw now. Please try again later";
            errorModal.show();
          });
      }
    },

    emptySearchbar() {
      this.searchInput = '';
      this.filterJobListings()
    },

    handleBackspace(event) {
      if (event.keyCode === 8) { // for backspace key
        this.searchInput = '';
      }
    },

    filterJobListings() {
      var mode = this.searchBy
      const query = this.searchInput ? this.searchInput.toLowerCase() : '';
      if (query == '') { // empty searchbar
        this.getAllJobListings(); 
      }
      else {
        if (mode == 0) { // search by job listing
          console.log(this.searchInput)
          this.jobListings = this.jobListings.filter((job) => {
            const jobTitle = job.Role_Name.toLowerCase();
            return jobTitle.includes(query);
            });
        }
        else { // search by skills
          const roleSkills = this.roleSkills // get all title-skills pairs
          const matchedJobListing = []
          for (const [title, skills] of Object.entries(roleSkills)) {
            for (const skill of skills) {
              if (skill.toLowerCase().includes(query) && !matchedJobListing.includes(title)) { // skill keyed in + title not already included
                matchedJobListing.push(title);
              }
            }
          }
          const matchingJobListings = this.jobListings.filter((job) => {
            const jobTitle = job.Role_Name.toLowerCase();
            console.log('jobTitle',jobTitle)
            this.jobListings = this.jobListings.filter((job) => {
              const jobTitleLower = job.Role_Name.toLowerCase();
              return matchedJobListing.some((matchedJob) => {
                const matchedJobLower = matchedJob.toLowerCase();
                return jobTitleLower.includes(matchedJobLower) && matchedJobLower.includes(jobTitleLower); 
                // ensure that job title must be in list of job title and matched jobs
              });
            });
          });
        } 
      }
    },

    filterByAlignment() {
      const alignmentThreshold = this.alignmentPercentage; // Get alignment threshold from user input
      console.log('Alignment Threshold:', alignmentThreshold); // Check if the alignment threshold is correct
    
      const filteredJobListings = this.originalJobListings.filter(job => {
        const jobData = this.skillsMatchDict[job.JobList_ID];
        if (jobData && jobData.alignment_percentage>=0) {
          const alignmentPercentage = jobData.alignment_percentage; // Access the alignment percentage
          console.log('Job ID:', job.JobList_ID, 'Alignment Percentage:', alignmentPercentage); // Check alignment percentage for each job
          return alignmentPercentage >= alignmentThreshold; // Compare against the threshold
        } else {
          console.error('Alignment percentage not found for job ID:', job.JobList_ID);
          return false; // Exclude the job if the alignment percentage is not available
        }
      });
      this.jobListings = filteredJobListings;
      console.log('Filtered Job Listings:', this.jobListings); // Log the filtered job listings
    },

    filterBySkills() {
      var listingContainsAllSkillFilter = true
      var filteredListings = []
      if (this.selectedSkills.length > 0) {
        for (var listing of this.originalJobListings) {
          var listing_skill = (this.roleSkills[listing.Role_Name])
          for (var skill of this.selectedSkills) {
            if (!listing_skill.includes(skill)) {
              listingContainsAllSkillFilter = false
              break
            }
          }
          if (listingContainsAllSkillFilter) {
            filteredListings.push(listing)
          }
          listingContainsAllSkillFilter = true
        }
        this.jobListings = filteredListings
      }
      else {
        this.jobListings = this.originalJobListings
      }
    },
    // filterBySkills() {
    //   if (this.selectedSkills.length === 0) {
    //     // If no skills are selected, return all listings
    //     return
    //   } else {
    //     // Filter the listings based on selected skills
    //     return this.originalJobListings.filter(job => {
    //       const jobData = this.skillsMatchDict[job.JobList_ID];
    //       if (jobData && this.selectedSkills) { 
    //         return jobData.role_skills.some(skill => this.selectedSkills.includes(skill));
    //       }
    //     });
    //   }
    // },

    clearFilter() {
      this.selectedSkills=[]
      this.jobListings = this.originalJobListings
    },

    changePlaceholder() {
      // console.log(this.searchBy)
      return this.searchBy === '1' ? 'Search by Skill Name' : 'Search by Job Title';
    },
    
    toggleDesc(job) {
      job.showDescription = !job.showDescription;
    },

    getAllSkills() {
      axios.get(GET_SKILLS_URL)
      .then(response => {
        for(let i = 0; i < response.data.data.skills.length; i++) {
          this.allSkills.push(response.data.data.skills[i].Skill_Name)
        }
      })
      .catch(error => {
        console.error('Error fetching skills:', error);
      });
    },
  },
});

const vm = jobsPage.mount("#jobsPage");
