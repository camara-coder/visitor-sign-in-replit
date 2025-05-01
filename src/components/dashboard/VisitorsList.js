import { useState } from 'react';
import { useQuery } from 'react-query';
import styles from '@/styles/Home.module.css';
import { fetchVisitors } from '@/lib/api';

export default function VisitorsList({ selectedEvent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const visitorsPerPage = 10;

  // Fetch visitors for the selected event
  const { data: visitors, isLoading, error } = useQuery(
    ['visitors', selectedEvent?.id],
    () => selectedEvent ? fetchVisitors(selectedEvent.id) : Promise.resolve([]),
    {
      enabled: !!selectedEvent,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Filter visitors based on search term
  const filteredVisitors = visitors 
    ? visitors.filter(visitor => 
        visitor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.phoneNumber?.includes(searchTerm) ||
        visitor.address?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Pagination
  const indexOfLastVisitor = currentPage * visitorsPerPage;
  const indexOfFirstVisitor = indexOfLastVisitor - visitorsPerPage;
  const currentVisitors = filteredVisitors.slice(indexOfFirstVisitor, indexOfLastVisitor);
  const totalPages = Math.ceil(filteredVisitors.length / visitorsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (!selectedEvent) {
    return (
      <div className={styles.visitorListContainer}>
        <h2>Visitors</h2>
        <div className={styles.noEventSelected}>
          <p>Please select an event to view visitor information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.visitorListContainer}>
      <div className={styles.visitorHeader}>
        <h2>Visitors for Event #{selectedEvent.id.substring(0, 8)}</h2>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search visitors..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchInput}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingVisitors}>Loading visitors...</div>
      ) : error ? (
        <div className={styles.errorVisitors}>Error loading visitors: {error.message}</div>
      ) : (
        <>
          {filteredVisitors.length > 0 ? (
            <>
              <div className={styles.visitorCount}>
                Showing {indexOfFirstVisitor + 1}-{Math.min(indexOfLastVisitor, filteredVisitors.length)} of {filteredVisitors.length} visitors
              </div>
              
              <div className={styles.tableContainer}>
                <table className={styles.visitorTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>Phone Number</th>
                      <th>Sign-in Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVisitors.map(visitor => (
                      <tr key={visitor.id}>
                        <td>{visitor.firstName} {visitor.lastName}</td>
                        <td>{visitor.address || 'N/A'}</td>
                        <td>{visitor.phoneNumber || 'N/A'}</td>
                        <td>{new Date(visitor.registrationTime).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles.pageButton}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles.pageButton}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noVisitors}>
              <p>No visitors found for this event.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
